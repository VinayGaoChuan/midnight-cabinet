// 恐狼（衍生单位 · 骷髅 · 战士 · 普通 · 近战；糖果女孩召唤的地狱犬）：肩峰巨狼，比灰狼高 6 格、胸宽一倍，前重后轻的楔形。
//   焦黑的骨架上只剩几块烧焦的皮，肋骨之间的骨缝透出熔红；背脊从后颈到肩峰燃着一排地狱火鬃；
//   脖子上一只红白条纹尖刺项圈，挂一颗包装糖果坠（糖果女孩同款）；一对竖立尖耳、吻收成窄楔；嘴角两根往前下方外翻的獠牙；前爪特别大，五根黑爪扇形外张。
// 攻击：抬起近侧前爪横拍过去，爪痕里飞出火星。技能「凶狠冲锋」：前爪刨地两次、火鬃窜高一倍、骨缝越来越亮、嘴里喷火舌；
//   施放时贴地冲锋 12 格，身后沿地面拖出一道火浪，双前爪同时拍下：火焰外爆 + 小地裂，目标被点燃并击退。
// 死亡：全身一亮，整只狼爆成一团火焰碎块散开（死亡套件 burst），项圈和糖果坠落地弹两下。
// 身体用 parts-beast 的 quad（canine 加大 + 肩峰）拼骨架与头腿；焦骨躯干、火鬃、尖刺项圈、獠牙、尖耳、巨爪是本模块的候选部件。
PCD.define('DireWolf', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_BURST, K_STILL,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, death } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.fire, EL = FXR[R_EL];                                                     // 地狱火 · 熔橙：白 21 → 淡黄 47 → 橙 46 → 红 45 → 深红 44
  const R_CHAR = fxRamp('direWolfChar', [47, 10, 9, 8, 0]);                                  // 受击：焦骨屑（带一颗火星色）
  const R_CANDY = fxRamp('direWolfCandy', [21, 58, 63, 12, 11]);                             // 糖果碎屑（粉，糖果女孩同源）
  const m = B.mats(E, {
    main: 'stone', limb: 'stone',                                                             // 焦黑骨与残皮（紫灰炭色）
    char: [0, 9, 10, 7], skin: [0, 20, 20, 19],                                               // 焦骨板 / 肋骨 · 烧焦的残皮
    flame: 'fire', flameHot: [46, 47, 21, 21],                                                // 火鬃 / 窜高发白的火鬃
    cred: 'crimson', cwhite: 'white', spike: 'bone', candy: 'pink', wrap: 'white',            // 红白条纹项圈 · 尖刺 · 糖果 + 糖纸
    tusk: 'bone', claw: [0, 0, 0, 29], scorch: [0, 10, 10, 18], eye: [0, 0, 47, 47], glow: [46, 46, 47, 21], teeth: 'bone',
  });
  m.seam0 = E.defMat([44, 44, 44, 44], 1, 1); m.seam1 = E.defMat([45, 45, 45, 45], 1, 1); m.seam2 = E.defMat([46, 46, 46, 46], 1, 1); m.seam3 = E.defMat([47, 47, 47, 47], 1, 1);   // 骨缝熔红 4 档（平涂：暗红 → 红 → 橙 → 黄）
  const SEAM = [m.seam0, m.seam1, m.seam2, m.seam3];
  const HEAD = { type: 'canine', w: 7.5, h: 6, snout: 5, snH: 3, tip: 0.5, ear: 'none', earH: 5, teeth: 2 };   // 吻收成窄楔；耳朵本模块自画（wolfEars，一对立耳）
  const SHAPE = { len: 15, chest: 6, rump: 3.8, waist: 0.45, hump: 2.5, leg: 7.5, lw: 2.5, thigh: 2.6, farDx: -2, stride: 3, lift: 2,
    neck: 3, neckA: 0.3, neckW: 3.4, head: HEAD, headA: 0.22, tail: 'thin', tailLen: 6, tailA: -0.15, tailCurl: 0.2, mane: 'none', foot: 'paw', fur: 0, m };
  const o = Q.shape(SHAPE), oBig = Q.shape(Object.assign({}, SHAPE, { chest: 6.8, rump: 4.3, hump: 3 }));   // oBig：爆开前膨胀 1 格

  const HX = 60, DUR = DEFAULT_DUR.slice(), hero = new Sprite(108, 60, 50, 56);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 9, 17, 26], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'glow', 'ink', 'teeth', 'spec', 'flame', 'flameHot', 'cred', 'cwhite', 'candy', 'wrap', 'seam0', 'seam1', 'seam2', 'seam3']) RIM.skip[m[k]] = 1;
  // 本角色的姿势字段：fl 火鬃 0 常态 / 1 窜高一倍 / 2 发白 · seam 骨缝亮度 0–3 · flick 火苗相位 · swell 膨胀 · boom 0 常态 / 1 爆开快照（不画项圈）/ 2 只剩项圈
  const EXTRA = [['fl', 0, 2], ['seam', 0, 3], ['flick', 0, 3], ['swell', 0, 1], ['boom', 0, 2], ['spread', 0, 1]];
  const SPEC = Q.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { Q.reset(P); P.fl = 0; P.seam = 0; P.flick = 0; P.swell = 0; P.boom = 0; P.spread = 0; }
  reset();
  let rig = Q.rig(P, o), oo = o;
  const HIT_POINT = rig.hit;
  const COL_Q = 0.4, COL0 = [R(lerp(rig.NB.x, rig.NT.x, COL_Q)), R(lerp(rig.NB.y, rig.NT.y, COL_Q))];   // 项圈（站姿）位置：掉落的起点

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'paw', 'reach', 'glow'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, paw: 0, reach: 0, glow: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const T_HIT = 2 / 12, T_SLAM = 3 / 12, T_BOOM = 10 / 12;
  const A_RAISE = pose({ bx: -1, paw: 3, pitch: 2, head: -1, jaw: 2, tail: 1, ear: 1 });            // 抬起近侧前爪
  const A_SWIPE = pose({ bx: 6, paw: 1, reach: 4, pitch: 0, head: 1, jaw: 1, tail: -2, ear: 1 });    // 横拍出去（定格）
  const A_FOLLOW = pose({ bx: 5, paw: 0, reach: 2, pitch: -1, head: 1, jaw: 1, tail: -1 });
  const ATK = [[0, REST], [0.12, A_RAISE, 'out'], [T_HIT, A_SWIPE, 'snap'], [0.25, A_SWIPE, 'lin'], [0.45, A_FOLLOW, 'out'], [0.75, REST, 'inOut']];
  const C_LOW = pose({ crouch: 2, pitch: -1, head: 1, jaw: 2, ear: 1, tail: 1, glow: 1 });          // 压低、张嘴喷火舌
  const S_REAR = pose({ crouch: 0, pitch: 3, head: -1, jaw: 3, paw: 2, reach: 2, tail: -2, ear: 1, glow: 3 });
  const S_SLAM = pose({ crouch: 2, pitch: -2, head: 1, jaw: 3, paw: 0, reach: 3, tail: -2, ear: 1, glow: 3 });
  const S_HOLD = pose({ crouch: 1, pitch: -1, head: 1, jaw: 1, reach: 2, tail: -1, glow: 2 });
  const DASH = 12;                                                                                  // 冲锋格数

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.mane = 0; P.seam = 1;
    if (lp >= 1.6 - 1e-6 && lp < 2.2 - 1e-6) { const k = f12of(lp - 1.6); P.head = 2; P.crouch = 1; P.ear = 1; P.jaw = k === 2 || k === 5 ? 1 : 0; P.fl = k === 2 || k === 5 ? 1 : 0; P.seam = k === 2 || k === 5 ? 2 : 1; }   // 低吼：压低头、鼻孔喷火星、火鬃一窜一窜
  }
  const tmp = {};
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset(); P.flick = (f12 >> 1) & 3;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { Q.anim.walk(P, tq); P.pitch = P.gf & 1 ? 1 : 0; P.seam = 1; const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; }   // 沉重奔袭：肩峰起伏
    else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); P.seam = tq >= 0.12 && tq < 0.34 ? 2 : 1; P.rim = tq >= 0.12 && tq < 0.34 ? 1 : 0; P.spread = tq >= T_HIT && tq < 0.34 ? 1 : 0; }
    else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_LOW, ease.inOut(tq / 0.7), F_ALL); apply(tmp); } else apply(C_LOW);
      if ((tq >= 0.15 && tq < 0.3) || (tq >= 0.45 && tq < 0.6)) { P.paw = 2; P.reach = 1; } else if ((tq >= 0.3 && tq < 0.4) || (tq >= 0.6 && tq < 0.7)) { P.paw = 0; P.reach = -2; }   // 前爪刨地两次
      P.fl = tq >= 0.4 ? 1 : 0; P.seam = Math.min(3, 1 + Math.floor(tq / 0.45)); P.rim = 2;
      if (tq > 0.45) P.glow = (f12 & 1) ? 2 : 1;
      if (tq > 1.1) { P.bob = (f12 & 1) ? -1 : 0; P.tail = (f12 & 1) ? 2 : 0; }
    } else if (st === CAST) {                                                                      // 贴地冲锋 12 格 → 人立半身 → 双爪拍下
      if (tq < T_HIT) { apply(C_LOW); P.crouch = 1; P.reach = 3; P.jaw = 3; P.glow = 3; P.gf = f12of(tq) & 1 ? 2 : 0; P.mx = R(DASH * (tq + 1 / 12) / T_SLAM); }
      else if (tq < T_SLAM) { apply(S_REAR); P.mx = DASH; }
      else { apply(tq < 5 / 12 ? S_SLAM : S_HOLD); P.mx = DASH; }
      P.fl = tq < 5 / 12 ? 2 : 1; P.seam = 3; P.rim = tq < 5 / 12 ? 3 : 2;
    } else if (st === RECOVER) {                                                                     // 往后跳回原位
      const q = clamp01(tq / 0.45), e = ease.inOut(q);
      if (tq < 0.45) { apply(S_HOLD); P.mx = R(DASH * (1 - e)); P.pitch = q < 0.5 ? 1 : 0; P.reach = 0; P.jaw = 0; P.glow = 1; P.bob = q > 0.3 && q < 0.7 ? -1 : 0; }
      else { const q2 = ease.inOut(clamp01((tq - 0.45) / 0.2)); E.mix(tmp, pose({ crouch: 1 }), REST, q2, F_ALL); apply(tmp); }
      P.fl = tq < 0.3 ? 1 : 0; P.seam = tq < 0.2 ? 3 : tq < 0.4 ? 2 : 1; P.rim = tq < 0.25 ? 2 : tq < 0.45 ? 1 : 0;
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); P.seam = h < 0.2 ? 2 : 1; } }
    else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { Q.anim.death(P, d, f12); P.seam = 2 + (f12 & 1); P.fl = 1; }
      else if (tq < T_BOOM) {                                                                       // 全身一亮：膨胀、骨缝亮到白、火鬃发白、发抖
        P.bx = -2 + ((f12 & 1) ? 1 : 0); P.swell = 1; P.pitch = 1; P.head = -2; P.jaw = 3; P.eyes = 1; P.tail = 2; P.seam = 3; P.fl = 2; P.glow = 3; P.rim = 3;
        P.flash = tq >= T_BOOM - 1 / 12 - 1e-6 ? 1 : 0;
      } else { P.boom = 2; const c = collarDrop(tq - T_BOOM); P.drop = c[0]; P.dsx = c[1]; P.dsy = c[2]; if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8); }   // 只剩项圈：落地弹两下 → 消散
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    oo = P.swell ? oBig : o; rig = Q.rig(P, oo);
    if (P.paw >= 3 && !rig.lie) rig.legs[3].F[1] -= 1;                                              // 抬爪顶点再高 1 格（quad 的 paw 最高 3 档）
    P.gx = R(rig.mouth[0]) + P.bx; P.gy = R(rig.mouth[1]);
    B.key(P, SPEC);
  }
  // 项圈掉落（纯函数）：爆开后 db 秒 → [1 飞行 / 2 落地, 横移, 离地高]：从颈高抛出落地 → 弹 3 格 → 弹 1 格 → 停
  const HOPS = [[0, 0.3, 4], [0.3, 0.5, 3], [0.5, 0.62, 1]], H0 = Math.min(11, Math.max(0, -COL0[1] - 2));
  function collarDrop(db) {
    const dx = R(9 * clamp01(db / 0.62));
    for (const [a, b, h] of HOPS) if (db < b) { const q = (db - a) / (b - a); return [db < 0.3 ? 1 : 2, dx, R(Math.sin(Math.PI * q) * h + (a === 0 ? (1 - q) * H0 : 0))]; }
    return [2, dx, 0];
  }

  // ───── 画 ─────
  // 候选部件：charredBody —— 焦骨躯干（一个部件）：按 quad 的 span 逐列填炭色，在同一个部件里叠：背线一排棘突、往后斜的焦骨肋骨，
  //   肋骨之间的骨缝透出熔红（seam 0–3 档）、肩胛骨板和骨盆板（焦骨色）、两块烧焦的残皮。c = { rib 肋骨区起点比例, seam }
  function charredBody(rg, oy, seam) {
    E.part(); const mm = oy.m, C1 = rg.C1, C2 = rg.C2, lie2 = rg.lie === 2;
    U.taper(E, rg.NB.x, rg.NB.y, rg.NT.x, rg.NT.y, oy.neckW, oy.neckW * 0.8, mm.body, 0);
    const x0 = Math.floor(C2.x - C2.r) - 1, x1 = Math.ceil(C1.x + C1.r) + 1, rb = R(C2.x + (C1.x - C2.x) * 0.3), re = R(C1.x + 1), sm = SEAM[seam];
    for (let x = x0; x <= x1; x++) {
      const s = Q.span(rg, oy, x); if (!s) continue; const h = s[1] - s[0];
      for (let y = s[0]; y <= s[1]; y++) U.dot(E, x, y, mm.body, 0);
      if (lie2) continue;
      if (x > x0 + 1 && x < x1 - 1 && h >= 4) { U.dot(E, x, s[0] + 1, mm.scorch, (x * 5 + 3) % 7 < 3 ? 4 : 3); if (x >= rb - 1 && ((x + 1) % 3) !== 0) U.dot(E, x, s[0] + 2, mm.scorch, 3); }   // 背上 / 肩头一层浅一些的焦皮
      if ((x & 1) === 0 && x > x0 + 1 && x < x1 - 2) U.dot(E, x, s[0], mm.char, 4);                 // 棘突
      if (x >= rb && x <= re && h >= 5) {                                                              // 肋骨 + 骨缝
        const k = x - rb, L = R(h * 0.7);
        if (k % 3 === 0) for (let j = 2; j <= L; j++) U.dot(E, x - Math.floor(j / 4), s[0] + j, mm.char, j === 2 ? 4 : 0);
        else if (k % 3 === 1) for (let j = 3; j < L; j++) U.dot(E, x - Math.floor(j / 4), s[0] + j, j < 5 ? SEAM[Math.min(3, seam + 1)] : sm, 0);   // 骨缝上端热一档
      }
    }
    if (lie2) return;
    const sh = Q.span(rg, oy, R(C1.x + 1));
    if (sh) { U.seg(E, C1.x + 2.5, sh[0] + 1, C1.x + 0.5, sh[0] + 5, 2, mm.char, 0); for (let k = 0; k < 3; k++) U.dot(E, C1.x + 3 + k, sh[0] + 2 + (k >> 1), mm.skin, k === 0 ? 4 : 0); }   // 肩胛骨板 + 肩上残皮
    U.oval(E, C2.x, C2.y - 0.5, 2, 1.5, mm.char, 0); U.dot(E, C2.x - 0.5, C2.y - 0.5, sm, 0);                                                   // 骨盆板 + 闭孔透红
    for (let k = 0; k < 3; k++) U.dot(E, C2.x + 1 + k, C2.y + 1.5 + (k & 1), mm.skin, 0);                                                        // 腿根残皮
  }
  // 候选部件：flameMane —— 背脊火鬃：从后颈到肩峰后每 3 列一根火舌（高低错开），向后上方窜出背线 2–4 格（按 flick 相位参差），fl 1 窜高一倍、fl 2 发白；
  //   根部红、中段橙、尖黄（或白）。单独一个部件，画在躯干之后
  function flameMane(rg, oy) {
    if (rg.lie === 2) return; E.part(); const C1 = rg.C1, mat = P.fl >= 2 ? m.flameHot : m.flame, lean = 0.5, xa = R(C1.x - 6), xb = R(rg.NB.x + 1);
    const HS = [4, 2, 5, 3, 4, 2];                                                                   // 火舌高低错开，读得出一根根
    for (let x = xa, i = 0; x <= xb; x += 3, i++) {
      const s = Q.span(rg, oy, x); const top = s ? s[0] : R(rg.NB.y - oy.neckW);
      const base = HS[(i + P.flick) % HS.length] - (x > rg.NB.x - 1 ? 1 : 0), H = P.fl ? base * 2 : base;
      for (let k = 0; k <= H; k++) {
        const xx = x - R(k * lean) + ((k === H && (P.flick & 1)) ? 1 : 0), tn = k >= H - 1 ? 4 : k >= H * 0.45 ? 3 : 2;
        U.dot(E, xx, top - k + 1, mat, tn); if (k < 2 || (P.fl && k < H * 0.4)) U.dot(E, xx + 1, top - k + 1, mat, k === 0 ? 2 : 3);
      }
    }
  }
  // 候选部件：spikeCollar —— 红白条纹尖刺项圈（沿颈轴 2 格宽，横穿颈部红白交替）+ 外侧 3 根骨白尖刺 + 喉下一颗包装糖果坠。
  //   at = [x, y] 时画成掉在地上的样子（flat 1 = 平躺的一圈、0 = 翻飞中的圆环）
  function spikeCollar(rg, at, flat) {
    E.part();
    if (at) {
      const [x, y] = at;
      if (flat) { for (let i = -3; i <= 3; i++) { U.dot(E, x + i, y, (i & 1) ? m.cwhite : m.cred, 0); if (Math.abs(i) < 3) U.dot(E, x + i, y - 1, (i & 1) ? m.cred : m.cwhite, 4); } U.dot(E, x - 2, y - 2, m.spike, 4); U.dot(E, x + 1, y - 2, m.spike, 4); candy(x + 5, y); }
      else { const ringP = [[-2, 0], [-2, -1], [-1, -2], [0, -2], [1, -2], [2, -1], [2, 0], [1, 1], [0, 1], [-1, 1]]; ringP.forEach(([dx, dy], i) => U.dot(E, x + dx, y + dy, (i & 1) ? m.cwhite : m.cred, 0)); U.dot(E, x, y - 3, m.spike, 4); U.dot(E, x + 3, y - 1, m.spike, 4); candy(x - 1, y + 3); }
      return;
    }
    const NB = rg.NB, NT = rg.NT, L = Math.hypot(NT.x - NB.x, NT.y - NB.y) || 1, vx = (NT.x - NB.x) / L, vy = (NT.y - NB.y) / L, nx = -vy, ny = vx;
    const cx = lerp(NB.x, NT.x, COL_Q), cy = lerp(NB.y, NT.y, COL_Q), r = o.neckW + 0.4;
    for (let s = -r, i = 0; s <= r + 0.01; s += 1, i++) for (let t = 0; t <= 1; t++) U.dot(E, cx + nx * s + vx * t, cy + ny * s + vy * t, (i & 1) ? m.cwhite : m.cred, t === 1 ? 4 : 0);
    for (const s of [-r + 0.5, -r + 2.5]) { const px = cx + nx * s - vx * 0.2, py = cy + ny * s - vy * 0.2; U.dot(E, px - vx - nx * 0.4, py - vy - 0.6, m.spike, 3); U.dot(E, px - vx * 2 - nx, py - vy * 2 - 1.2, m.spike, 4); }   // 背侧尖刺（往后上翘）
    if (!rg.lie) { const bx = cx + nx * (r + 0.8), by = cy + ny * (r + 0.8); U.dot(E, bx, by, m.cred, 2); candy(R(bx), R(by) + 2); }
  }
  function candy(x, y) {                                                                           // 糖果坠：2×2 粉色糖心 + 两头扭起的白糖纸（和项圈同一个部件）
    [[0, 0, 4], [1, 0, 3], [0, 1, 3], [1, 1, 2]].forEach(([dx, dy, tn]) => U.dot(E, x + dx, y + dy, m.candy, tn));
    U.dot(E, x - 1, y, m.wrap, 4); U.dot(E, x - 2, y - 1, m.wrap, 4); U.dot(E, x - 2, y + 1, m.wrap, 3);
    U.dot(E, x + 2, y + 1, m.wrap, 3); U.dot(E, x + 3, y, m.wrap, 4); U.dot(E, x + 3, y + 2, m.wrap, 2);
  }
  // 候选部件：flareTusks —— 下颌外翻獠牙：根在嘴角（吻尖后 2.5 / 3.3 格，近 / 远），从下唇沿斜着往前下方伸出下颌轮廓 2 格（跟着 jaw 张开下移）；
  //   吻尖保持干净。并进头这个部件（紧跟 quad.head 画，不另起分界线）
  function flareTusks(rg, oy) {
    if (rg.lie === 2) return; const F = Q.headFrame(rg, oy, P.jaw);
    for (const [du, far] of [[3.3, 1], [2.5, 0]]) {
      const u = F.uT - du, pr = F.prof(u), g = F.gap(u), v0 = pr[2] + g + 0.5, vEnd = pr[1] + g + 2;
      for (let v = v0, k = 0; v <= vEnd + 0.01; v += 1, k++) { const p = F.at(u + k * 0.55, v); U.dot(E, p[0], p[1], m.tusk, v + 1 > vEnd ? 4 : far ? 2 : 3); }
    }
  }
  // 候选部件：pointEars —— 一对竖立的尖耳（犬科）：颅顶后方两只，近耳在前、远耳往后错 3 格、矮 1 格；底 2 格宽、上半 1 格收尖，
  //   ear 1 时往后贴。远耳单独一个部件画在头之前（暗一级），近耳紧跟头画（同一部件，亮一级）。c = { h 耳高, far }
  function pointEar(F, far) {
    const h = far ? HEAD.earH - 1 : HEAD.earH, b = F.at(F.W * (far ? -0.7 : 0.05), -F.Hh + 0.4), pin = P.ear | 0, mat = far ? m.far : m.limb;
    for (let k = 0; k < h; k++) {
      const xo = b[0] - k * (pin ? 0.9 : 0.25), y = b[1] - 1 - k * (pin ? 0.6 : 1), top = k >= h - 1.5;
      U.dot(E, xo, y, mat, far ? 0 : top ? 4 : 3); if (!top) U.dot(E, xo - 1, y, mat, far ? 0 : k === 0 ? 2 : 3);
      if (!far && k >= 1 && k < h - 2) U.dot(E, xo - 1, y, m.skin, 0);                                // 近耳内侧一道焦皮
    }
  }
  // 候选部件：bigPaw —— 特大的前爪：quad 的脚再往前加宽 2 格、脚背加高 1 格；近侧前爪五根黑爪扇形外张（伸出剪影 2 格，spread 1 时张得更开），
  //   远侧前爪三根短黑爪 + 一根后悬爪；紧跟 quad.leg 画（同一个部件）
  const FAN = [[[5, 0], [6, 0]], [[5, -1], [6, -2]], [[4, -2], [5, -3]], [[3, -3], [3, -4]], [[1, -3], [0, -4]]];                  // 着地：平伸 → 斜上 → 竖起
  const FAN_WIDE = [[[5, 1], [6, 2]], [[5, 0], [7, 0]], [[5, -2], [6, -3]], [[3, -3], [4, -5]], [[1, -3], [0, -5]]];             // 横拍定格：再张开一档
  function bigPaw(L) {
    if (rig.lie === 2) return; const fx = R(L.F[0]), fy = R(L.F[1]), mat = L.far ? m.far : m.limb;
    for (let k = 0; k < 3; k++) { U.dot(E, fx + 2 + k, fy, mat, 0); if (k < 2) U.dot(E, fx + 2 + k, fy - 1, mat, k ? 0 : 4); }
    if (L.far) { U.dot(E, fx + 5, fy, m.claw, 3); U.dot(E, fx + 5, fy - 1, m.claw, 3); U.dot(E, fx + 4, fy - 2, m.claw, 4); U.dot(E, fx - 2, fy, m.claw, 3); return; }
    for (let k = 0; k < 3; k++) U.dot(E, fx + k, fy - 2, mat, k === 2 ? 4 : 0);                                                   // 脚背
    const fan = P.spread ? FAN_WIDE : FAN;
    for (const c of fan) c.forEach(([dx, dy], j) => U.dot(E, fx + dx, fy + dy, m.claw, j ? 4 : 3));
    U.dot(E, fx - 2, fy, m.claw, 3);                                                                                                // 后悬爪
  }
  function legs(far) { for (let i = 0; i < 4; i++) { const L = rig.legs[i]; if (!!L.far !== !!far) continue; Q.leg(E, rig, P, oo, i); if (L.front) bigPaw(L); } }
  function drawHero() {
    begin(hero, P.bx, 0);
    if (P.boom === 2) { if (P.drop) spikeCollar(rig, [COL0[0] + P.dsx, -P.dsy - (P.drop === 2 ? 0 : 2)], P.drop === 2 && P.dsy === 0 ? 1 : 0); return; }
    const legsLast = rig.lie === 2;
    if (!legsLast) legs(1);
    Q.tail(E, rig, P, oo);
    charredBody(rig, oo, P.seam);
    if (!legsLast) legs(0);
    flameMane(rig, oo);
    if (!P.boom) spikeCollar(rig, null, 0);
    if (rig.lie !== 2) { E.part(); pointEar(Q.headFrame(rig, oo, P.jaw), 1); }
    Q.head(E, rig, P, oo); if (rig.lie !== 2) pointEar(Q.headFrame(rig, oo, P.jaw), 0); flareTusks(rig, oo);
    if (legsLast) { legs(1); legs(0); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, tongueAcc = 0, soulAcc = 0, emberAcc = 0, lastGf = -9, swT = 9, swX = 0, swY = 0;
  const mouthScr = () => [scrX(P.gx), HY + P.gy];
  const pawScr = (i) => { const L = rig.legs[i]; return [scrX(R(L.F[0]) + P.bx + 3), HY + R(L.F[1])]; };
  const noseScr = () => { const F = Q.headFrame(rig, oo, P.jaw), p = F.at(F.uT - 0.5, F.prof(F.uT)[0]); return [scrX(R(p[0]) + P.bx), HY + R(p[1])]; };
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [gx, gy] = mouthScr();
      releaseOrbit(40, 100, 0.3, 0.6); burst(gx, gy, 12, 40, 100, 0.25, 0.5, R_EL, 8);
      fx.wave(scrX(-8), HY, 1, DASH + 16, 6, R_EL, 0.75, 0);                                        // 身后沿地面拖出的火浪
      for (let i = 0; i < 10; i++) spawn(K_DUST, scrX(-6) + (Math.random() - 0.5) * 10, HY, -14 - Math.random() * 30, -4 - Math.random() * 10, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.28, 2); flash(0.05); sfx('swing', { kind: 'claw', w: 0.6 });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                               // 爪拍：弧形拖影 + 三道火爪痕 + 火星
      const [px, py] = pawScr(3); swT = 0; swX = DUMMY_X - 6; swY = HY - 16;
      fx.slash(px - 3, py + 1, 8, 0.1, 2.3, R_EL, 0.2, 2, 2);
      burst(DUMMY_X - 4, HY - 13, 12, 40, 110, 0.15, 0.4, FXI.impact, 8); burst(DUMMY_X - 4, HY - 13, 10, 40, 110, 0.2, 0.5, R_EL, 12); hitDummy(0, 1);
      sfx('swing', { kind: 'claw', w: 0.75 }); sfx('hit', { mat: 'flesh', w: 0.7 });
    }
    if (s === CHARGE && (t === 0.3 || t === 0.6)) {                                                 // 刨地：火星往后溅
      const [px] = pawScr(3); for (let i = 0; i < 7; i++) spawn(K_BURST, px - 1, HY - 1, -20 - Math.random() * 50, -20 - Math.random() * 40, 0.3 + Math.random() * 0.3, R_EL);
      for (let i = 0; i < 3; i++) spawn(K_DUST, px, HY, -10 - Math.random() * 20, -4 - Math.random() * 6, 0.3, FXI.dust); sfx('step', { w: 0.5 });
    }
    if (s === CAST && t === T_SLAM) {                                                                // 双爪拍下：火焰外爆 + 小地裂 + 点燃 + 击退
      const [px] = pawScr(3), cx = Math.min(px, DUMMY_X - 4);
      burst(cx, HY - 3, 30, 50, 140, 0.3, 0.7, R_EL, 16); ring(cx, HY - 3, 1, R_EL); fx.cross(cx, HY - 5, 7, R_EL, 0.3, 2);
      fx.crack(cx - 2, FLOOR, 10, 1, R_EL, 0.9); fx.crack(cx - 3, FLOOR, 7, -1, R_EL, 0.8);
      for (let i = 0; i < 8; i++) spawn(K_DUST, cx + (Math.random() - 0.5) * 10, HY - 1, (Math.random() - 0.5) * 40, -8 - Math.random() * 16, 0.4 + Math.random() * 0.3, FXI.dust);
      hitDummy(1, 1); dummyFx({ dur: 1.5, tint: 'fire' }); shake(0.12, 1); sfx('impact', { pal: 'fire', w: 0.75 });
    }
    if (s === HURT && t === INCOMING) { burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 8, 30, 80, 0.2, 0.45, R_CHAR, 12); burst(HX + HIT_POINT[0], HY + HIT_POINT[1] - 4, 4, 20, 50, 0.3, 0.5, R_EL, 16); }
    if (s === IDLE && (t === 1.6 + 2 / 12 || t === 1.6 + 5 / 12)) { const [nx, ny] = noseScr(); for (let k = 0; k < 2; k++) spawn(K_EMBER, nx + k, ny, 8 + Math.random() * 8, -4 - Math.random() * 6, 0.4 + Math.random() * 0.2, R_EL); }   // 鼻孔喷两颗火星
    if (s === DEATH && t === T_BOOM) {                                                               // 爆燃：先画好发白膨胀、不带项圈的这一帧，再交给死亡套件炸成火焰碎块
      poseAt(DEATH, T_BOOM - 1e-3, E.simT); P.flash = 0; P.boom = 1; B.key(P, SPEC); drawHero(); bakeHero();
      death.start('burst', { power: 1.1, fromX: 3, fromY: -14, fadeAt: 1.0, fadeDur: 0.6 });
      const cx = HX + 2, cy = HY - 14;
      burst(cx, cy, 44, 60, 170, 0.3, 0.85, R_EL, 16); ring(cx, cy, 1, R_EL); fx.cross(cx + 4, cy - 6, 8, R_EL, 0.3, 2); burst(cx + 8, cy, 8, 40, 90, 0.3, 0.6, R_CANDY, 12);
      shake(0.22, 2); flash(0.05); sfx('impact', { pal: 'fire', w: 1 });
      poseAt(DEATH, T_BOOM, E.simT); hero.k1 = hero.k2 = -1;
    }
    if (s === DEATH && T_BOUNCE.indexOf(t) >= 0) { const x = HX + COL0[0] + collarDrop(t - T_BOOM)[1]; sfx('hit', { mat: 'metal', w: 0.2 }); for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 14, -3 - Math.random() * 4, 0.3, FXI.dust); }
  }
  const T_BOUNCE = HOPS.map((h) => Math.ceil((T_BOOM + h[1]) * 12 - 1e-6) / 12);
  const EVENTS = [[1.6 + 2 / 12, 1.6 + 5 / 12], [], [T_HIT], [0.3, 0.6], [T_SLAM], [], [INCOMING], [T_BOOM].concat(T_BOUNCE), []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = mouthScr();
    if (state === CHARGE) {
      chargeAcc += dt * (12 + 22 * clamp01(stT / DUR[CHARGE]));                                      // 火星螺旋吸进嘴里
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 11 + Math.random() * 9; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
      if (stT > 0.5) { tongueAcc += dt * 22; while (tongueAcc >= 1) { tongueAcc -= 1; spawn(K_BURST, gx + 1, gy + 1, 30 + Math.random() * 30, -6 + Math.random() * 10, 0.12 + Math.random() * 0.12, R_EL); } }   // 火舌
    }
    if (state === CAST && stT < T_SLAM && Math.random() < dt * 40) spawn(K_EMBER, scrX(-10) + Math.random() * 8, HY - 2 - Math.random() * 10, -10 - Math.random() * 10, -6 - Math.random() * 6, 0.4, R_EL);
    if (state === MOVE && P.gf !== lastGf) {                                                          // 沉重奔袭：每步 3–4 颗尘 + 1 格余烬脚印
      if (P.gf === 0 || P.gf === 2) {
        const fx0 = scrX(P.gf === 0 ? 12 : -8);
        for (let i = 0; i < 4; i++) spawn(K_DUST, fx0 + (Math.random() - 0.5) * 5, HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 7, 0.3 + Math.random() * 0.3, FXI.dust);
        spawn(K_STILL, fx0, HY, 0, 0, 0.3, R_EL); spawn(K_STILL, fx0 + 1, HY, 0, 0, 0.3, R_EL); sfx('step', { w: 0.75 });
      }
      lastGf = P.gf;
    }
    if ((state === IDLE || state === MOVE) && Math.random() < dt * 5) { const c1 = rig.C1; spawn(K_EMBER, scrX(R(c1.x) + P.bx - 1 + Math.random() * 4), HY + R(c1.y - c1.r) - 4, Math.random() * 6 - 3 - (state === MOVE ? 10 : 0), -8 - Math.random() * 6, 0.4 + Math.random() * 0.3, R_EL); }   // 火鬃飘出的余烬
    if (state === RECOVER && stT < 0.4) { emberAcc += dt * 10; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx, gy, Math.random() * 6 - 3, -6 - Math.random() * 5, 0.5, R_EL); } }
    if (state === DEATH && stT > T_BOOM && stT < INCOMING + 2.4) {                                    // 余烬 → 魂光
      soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 34, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, stT > INCOMING + 1.4 ? FXI.soul : R_EL); }
    }
    swT += dt;
  }
  function fxReset() { chargeAcc = 0; tongueAcc = 0; soulAcc = 0; emberAcc = 0; lastGf = -9; swT = 9; }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie && !P.boom) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  function fxFront(f12) {
    if (swT < 3 / 12) {                                                                              // 三道斜爪痕（火色，第 1 帧亮、之后断续变暗）
      const first = swT < 1 / 12, c = first ? EL[0] : swT < 2 / 12 ? EL[2] : EL[3];
      for (let k = 0; k < 3; k++) for (let j = 0; j <= 7; j++) { if (!first && ((j + k + f12) & 1)) continue; put(swX + k * 3 + (j >> 1), swY + j + k, j < 2 ? EL[1] : c); }
    }
  }

  return {
    name: '恐狼', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.glow, m.eye, m.flame, m.flameHot, m.seam1, m.seam2, m.seam3], HIT_POINT, EVENTS,
    deathKit: { mode: 'burst', at: T_BOOM },
    SFX: { body: 'beast', how: 'explode', pal: 'fire', style: 'fire', w: 0.75 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
