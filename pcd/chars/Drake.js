// 幼龙（敌人 · 野兽 · 优质 · 远程 640）：双足翼龙少年——没有前腿，一对折叠膜翼就是前肢，翼肘着地像拐杖；后腿站立、身体前倾、长尾平衡；
// 头顶一对短钝幼角、颈后一排刚冒头的小骨刺，喉下热囊透出橙光，尾尖一团小尾焰。焦橙红幼鳞、沙色腹线、暗酒红翼膜。
// 攻击 = 射：昂头吸气，低头吐出一颗拖火尾的火球；技能 = 无特性，表现描述「炽热的呼吸」：张翼撑地深吸气（热囊 1 → 3 档胀大）→
// 低头喷出一道横向火流 + 火浪推到目标脚下点燃 → 地面余火熄灭。死亡 = 坠落：扑腾翅膀离地 3 格，翼一软坠地，尾焰熄灭冒黑烟，化灰。
// 身体用 parts-beast 的 quad（dragon 头型缩小、long 尾、只画两条后腿）；翼手（膜翼当前肢）、热囊、尾焰、颈刺是本模块的自画部件（候选部件）。
PCD.define('Drake', (E) => {
  const { Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.fire, EL = FXR[R_EL];                                              // 炽热吐息 · 火焰：白 → 淡黄 → 橙 → 红 → 深红
  const R_SMOKE = FXI.dust;
  const MAIN = E.ramp(['#2a0c04', '#6e2410', '#b8481c', '#e8803a']);
  const m = B.mats(E, {
    main: MAIN,                                                                       // 焦橙红幼鳞
    belly: 'sand', wing: 'crimson', horn: 'bone', claw: 'bone', eye: [0, 0, 14, 5],
    glow: { r: [44, 45, 46, 47], flat: 1 },                                           // 张嘴时口里的火光
  });
  m.wbone = E.defMat([MAIN[0], MAIN[1], MAIN[1], MAIN[2]], 1);                      // 翼臂骨 / 翼指：比鳞暗一级（和身体分开）
  m.wboneFar = E.defMat([MAIN[0], MAIN[1], MAIN[1], MAIN[1]], 1);                    // 远翼的骨再暗一级
  m.legN = E.defMat(E.ramp(['#2a0c04', '#b8481c', '#e8803a', '#f7b068']), 1);        // 近侧后腿：亮一档（远侧后腿用 m.far 暗一档）
  m.hornFar = E.defMat('bone', 1, 0, 1);                                              // 远侧角暗一级
  m.heat = E.defMat([44, 45, 46, 47], 1, 1); m.hot = E.defMat([46, 47, 21, 21], 1, 1); // 热囊 / 尾焰（发光体）
  const SHAPE = { len: 7, chest: 3.8, rump: 4.2, waist: 0.15, hump: 0, leg: 6, lw: 2, thigh: 2.4, farDx: -2, stride: 2, lift: 2, foot: 'claw',
    neck: 5, neckA: 1.05, neckW: 1.8, head: { type: 'dragon', w: 6, h: 5, snout: 3.5, snH: 2.8, tip: 0.8, horn: null, teeth: 1 }, headA: 0.25,
    tail: 'long', tailLen: 11, tailA: 0.2, tailW: 3, tailCurl: 0.3, mane: 'none', fur: 0, pattern: 'scales', lieLegs: 1, m };
  const o = Q.shape(SHAPE), oShort = Q.shape(Object.assign({}, SHAPE, { neck: 3.2 }));   // 缩脖子
  const oLegN = Q.shape(Object.assign({}, SHAPE, { m: Object.assign({}, m, { limb: m.legN }) }));   // 近侧后腿换亮一档材质
  const shp = () => (P.nk ? oShort : o);

  const HX = 34, DUR = DEFAULT_DUR.slice(), hero = new Sprite(96, 58, 50, 52);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 14, 19], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'ink', 'spec', 'claw', 'teeth', 'horn', 'hornFar', 'heat', 'hot', 'glow', 'wing', 'wingFar']) RIM.skip[m[k]] = 1;
  // 自己的姿势字段：wf / wn 远 / 近翼姿（见 WPOSE）· sac 热囊 0 待机 · 1 蓄 1 · 2 蓄满 · 3 喷吐 · 4 熄灭 · fl 尾焰 0 小 · 1 大 · 2 熄灭 · nk 缩脖子
  const SPEC = Q.KEYS.concat(B.COMMON, [['wf', 0, 6], ['wn', 0, 6], ['sac', 0, 4], ['fl', 0, 2], ['nk', 0, 1]]);
  const P = {};
  function reset() { Q.reset(P); P.pitch = 2; P.wf = 0; P.wn = 0; P.sac = 0; P.fl = 0; P.nk = 0; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = [R(rig.C1.x - 1), R(rig.C1.y + 1)];

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'tail'];
  const REST = { bx: 0, crouch: 0, pitch: 2, head: 0, jaw: 0, tail: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ pitch: 4, head: -2, tail: 1 });                               // 昂头吸气
  const A_SPIT = pose({ bx: 1, pitch: 1, head: 2, jaw: 2, tail: -2 });               // 低头吐火球
  const A_HOLD = pose({ pitch: 1, head: 1, jaw: 1, tail: -1 });
  const C_BREATH = pose({ pitch: 5, head: -2, tail: 1 });                             // 张翼撑地、后仰深吸气
  const S_CAST = pose({ bx: 1, pitch: 1, head: 3, jaw: 3, tail: -2 });                // 低头喷吐
  const T_SPIT = 2 / 12, T_WAVE = 0.2, T_FALL = INCOMING + 0.66;
  const tmp = {};
  const apply = (src) => { for (const f of F_ALL) P[f] = R(src[f]); };
  const flick = (f12) => ((f12 >> 1) & 1);
  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.fl = flick(f12);
    if (lp >= 1.6 - 1e-6 && lp < 2.0) {                                               // 待机个性「打喷嚏」：吸鼻 → 嚏！喷出火星 → 被自己吓得缩脖子
      const k = Math.min(4, f12of(lp - 1.6));
      if (k === 0) P.head = -1; else if (k === 1) { P.head = -2; P.eyes = 1; } else if (k === 2) { P.head = 1; P.jaw = 1; P.eyes = 1; P.sac = 1; }
      else { P.nk = 1; P.crouch = 1; P.eyes = k === 3 ? 1 : 0; P.head = 1; }
    }
  }
  const WALK_W = [[0, 1], [3, 3], [1, 0], [4, 4]], WALK_L = [0, 2, 0, 1];            // [远翼, 近翼]、离地（后腿蹦）
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                           // 双足蹦 + 翼肘点地：后腿交替蹦、两翼肘轮流撑地，经过帧扑一下翅膀
      const f = Q.anim.walk(P, tq); P.wf = WALK_W[f][0]; P.wn = WALK_W[f][1]; P.lift = WALK_L[f]; P.head = f === 1 ? -1 : f === 3 ? 1 : 0; P.fl = f & 1;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { E.mix(tmp, REST, A_WIND, ease.out(tq / 0.12), F_ALL); apply(tmp); P.sac = 1; }
      else if (tq < 0.25) { apply(A_SPIT); P.sac = 2; P.glow = 1; P.rim = 1; P.wn = 1; }
      else if (tq < 0.45) { E.mix(tmp, A_SPIT, A_HOLD, ease.out((tq - 0.25) / 0.2), F_ALL); apply(tmp); P.sac = 1; }
      else { E.mix(tmp, A_HOLD, REST, ease.inOut(clamp01((tq - 0.45) / 0.3)), F_ALL); apply(tmp); }
      P.fl = flick(f12);
    } else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.7)); E.mix(tmp, REST, C_BREATH, q, F_ALL); apply(tmp);
      P.wf = q > 0.3 ? 2 : 0; P.wn = q > 0.5 ? 2 : q > 0.2 ? 1 : 0;
      P.sac = tq < 0.45 ? 1 : tq < 1.0 ? 2 : ((f12 & 1) ? 3 : 2); P.rim = 2; P.fl = 1;
      if (tq > 1.1) P.tail = (f12 & 1) ? 2 : 0;                                         // 蓄满：尾巴抖
    } else if (st === CAST) { E.mix(tmp, C_BREATH, S_CAST, ease.out(clamp01(tq / 0.12)), F_ALL); apply(tmp); P.wf = 5; P.wn = 5; P.sac = 3; P.glow = 2; P.rim = 3; P.fl = 1; }
    else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_CAST, REST, q, F_ALL); apply(tmp);
      P.jaw = q < 0.4 ? 1 : 0; P.sac = q < 0.3 ? 2 : q < 0.65 ? 1 : 0; P.wf = q < 0.35 ? 5 : q < 0.7 ? 4 : 0; P.wn = P.wf; P.rim = q < 0.4 ? 2 : 1; P.fl = flick(f12); P.eyes = q > 0.5 && q < 0.8 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); P.pitch = 2 + (h < 0.35 ? 1 : 0); if (h < 0.35) { P.wf = 4; P.wn = 4; P.fl = 1; } }
    } else if (st === DEATH) {                                                        // 坠落：扑腾想飞 → 离地 3 格 → 翼一软坠地侧躺 → 尾焰熄灭冒黑烟 → 化灰
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { Q.anim.hurt(P, d); P.pitch = 3; P.crouch = d < 0.15 ? 1 : 2; P.wf = 4; P.wn = 4; P.flash = d < 1 / 12 ? 1 : 0; P.sac = (f12 & 1) ? 1 : 4; }
      else if (d < 0.5) { const up = (f12 & 1); P.wf = up ? 3 : 4; P.wn = up ? 3 : 4; P.lift = d < 0.37 ? 1 : d < 0.44 ? 2 : 3; P.pitch = 3; P.jaw = 1; P.head = -1; P.tail = up ? 2 : -2; P.bx = -1; P.sac = 4; P.fl = 1; }
      else {
        P.lie = 2; P.wf = 6; P.wn = 6; P.pitch = 0; P.bx = -2; P.eyes = 1; P.jaw = 1; P.sac = 4; P.fl = 2;
        P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.tail = d < 0.9 ? 2 : d < 1.0 ? 1 : 0;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, shp());
    const s = sacAt(); P.gx = R(s[0]) + P.bx; P.gy = R(s[1]);
    B.key(P, SPEC);
  }

  // ───── 自画部件 ─────
  // 候选部件：wyvernWing —— 翼手（膜翼当前肢）。一个部件：膜 + 臂骨（肩 → 腕，2 格）+ 3 根翼指 + 拇指爪。骨用暗一级的 wbone（和鳞分开）。
  //   w 腕（相对肩），g = 1 腕撑地（翼肘着地像拐杖）；t 三个指尖；b 膜后缘挂在背上的点。
  //   k：翼指从前臂上哪一点分出去（0 = 肩，1 = 腕）。收拢撑地时 k 小：翼指贴着前臂收上去、从肩后扇出，伸出背线，
  //   膜只在前臂后面留一条窄带——不再从地面的腕一路斜穿过身体（第 1 轮身体里满是斜线就是这个原因）。飞起时 k = 1，翼指从腕扇开。
  const WPOSE = [
    { w: [6, 0], g: 1, k: 0.15, t: [[-2, -9], [-6, -7], [-8, -3]], b: [-4, 2] },          // 0 收拢撑地
    { w: [8, 0], g: 1, k: 0.15, t: [[-1, -9], [-5, -8], [-7, -4]], b: [-4, 2] },          // 1 往前撑一步
    { w: [7, 0], g: 1, k: 0.15, t: [[1, -12], [-7, -12], [-13, -6]], b: [-6, 2] },        // 2 张开撑地（蓄力）
    { w: [2, -7], k: 1, t: [[-3, -15], [-10, -13], [-14, -6]], b: [-6, 2] },              // 3 上扬
    { w: [6, 3], k: 1, t: [[-1, 9], [-6, 8], [-11, 4]], b: [-6, 2] },                     // 4 下压
    { w: [4, -6], k: 1, t: [[2, -13], [-7, -14], [-14, -9]], b: [-6, 2] },                // 5 全展（施放，翼展 26）
    { w: [6, 4], k: 1, t: [[0, 5], [-6, 6], [-12, 5]], b: [-6, 1] },                      // 6 瘫软垂地（死亡）
  ];
  function wyvernWing(sx, sy, pose, far) {
    part();
    const W = WPOSE[pose | 0] || WPOSE[0], mem = far ? m.wingFar : m.wing, bone = far ? m.wboneFar : m.wbone;
    const wx = sx + W.w[0], wy = W.g ? -1 : Math.min(-1, sy + W.w[1]), bx = sx + W.b[0], by = sy + W.b[1];
    const kx = lerp(sx, wx, W.k), ky = lerp(sy, wy, W.k);                             // 翼指分出点
    const tips = W.t.map(([dx, dy]) => [sx + dx, Math.min(-1, sy + dy)]);
    const p = W.k >= 1 ? [sx, sy, wx, wy] : [kx, ky];
    for (let i = 0; i < tips.length; i++) {
      p.push(tips[i][0], tips[i][1]);
      const n = i < tips.length - 1 ? tips[i + 1] : [bx, by], dq = i < tips.length - 1 ? 0.18 : 0.4;
      p.push(lerp((tips[i][0] + n[0]) / 2, kx, dq), lerp((tips[i][1] + n[1]) / 2, ky, dq));
    }
    p.push(bx, by);
    if (W.k < 1) {                                                                    // 收拢：膜只在前臂后面留一条窄带，到胸下沿为止
      const dx = wx - kx, dy = wy - ky, L = Math.hypot(dx, dy) || 1, mx = kx + dx * 0.35, my = ky + dy * 0.35;
      p.push(mx - (dy / L) * 1.6, my + (dx / L) * 1.6, mx, my);
    }
    U.poly(E, p, mem, 0);
    for (let i = 0; i < tips.length; i++) { const e = i === 0 ? 1 : 0.85; U.seg(E, kx, ky, lerp(kx, tips[i][0], e), lerp(ky, tips[i][1], e), 1, bone, i === 0 ? 4 : 0); }   // 翼指（前缘最亮）
    U.seg(E, sx, sy, wx, wy, far ? 1 : 2, bone, 0);                                   // 臂骨（撑地时就是拐杖）
    U.dot(E, wx + 1, wy, m.claw, 3); if (W.g) U.dot(E, wx + 2, wy, m.claw, 4);         // 拇指爪（撑地时伸出去扣住地面）
  }
  // 候选部件：drakeHorns —— 一对实心短钝幼角：近侧 2 格宽 × 3 格高，从头顶往后上斜（每升 2 格后退 1 格）；
  //   远侧角往后错开 3 列、低 1 格、暗一级，两角之间留一道开口的缝（不围成环）
  const HORN = [[0, 0], [1, 0], [0, -1], [1, -1], [-1, -2], [0, -2]];
  function drakeHorns() {
    const F = Q.headFrame(rig, shp(), P.jaw), b = F.at(-F.W * 0.1, -F.Hh + 0.5), hx = R(b[0]), hy = R(b[1]);
    part(); for (const [dx, dy] of HORN) U.dot(E, hx - 3 + dx, hy + 1 + dy, m.hornFar, 0);
    part(); for (const [dx, dy] of HORN) U.dot(E, hx + dx, hy + dy, m.horn, 0);
  }
  // 候选部件：neckSpikes —— 颈后一排刚冒头的小骨刺（沿颈背 3 根，中间那根高 2 格）
  function neckSpikes() {
    part(); const NB = rig.NB, NT = rig.NT, dx = NT.x - NB.x, dy = NT.y - NB.y, L = Math.hypot(dx, dy) || 1, nx = dy / L, ny = -dx / L, rw = shp().neckW + 0.6;
    for (const [q, h] of [[0.15, 1], [0.5, 2], [0.85, 1]]) { const x = NB.x + dx * q + nx * rw, y = NB.y + dy * q + ny * rw; for (let k = 0; k < h; k++) U.dot(E, x + nx * k - 0.4 * k, y + ny * k, m.horn, k === h - 1 ? 4 : 3); }
  }
  // 候选部件：heatSac —— 喉下热囊（发光体，鼓出颈前下沿；5 档：待机 / 蓄 1 / 蓄满 / 喷吐 / 熄灭，越往后越大越白）
  const SAC = [[0.9, 'heat', 2, 3], [0.9, 'heat', 3, 4], [1.3, 'heat', 4, 3], [1.7, 'hot', 2, 3], [0.9, 'heat', 1, 1]];
  function sacAt() {
    const NB = rig.NB, NT = rig.NT, dx = NT.x - NB.x, dy = NT.y - NB.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, rw = shp().neckW * 0.75;
    return [NB.x + dx * 0.4 + nx * rw, NB.y + dy * 0.4 + ny * rw];
  }
  function heatSac() {
    part(); const [x, y] = sacAt(), s = SAC[P.sac | 0];
    U.disc(E, x, y, s[0], m[s[1]], s[2]);
    if (P.sac === 2) U.dot(E, x, y, m.hot, 3); else if (P.sac === 3) U.disc(E, x, y, 0.9, m.hot, 3); else U.dot(E, x, y, m.heat, s[3]);
  }
  // 尾尖位置：照 quad.tail 的同一套步进（纯函数）
  function tailTip() {
    const oo = shp(), n = oo.tailLen, sw = (P.tail | 0) * 0.2; let x = rig.tail.x, y = rig.tail.y, a = rig.lie === 2 ? -0.05 : oo.tailA;
    for (let k = 0; k < n; k++) { const q = k / n; a += (oo.tailCurl * q * 0.35) + sw * (0.25 + q) * 0.35; x -= Math.cos(a); y -= Math.sin(a); if (y > -0.5) { y = -0.5; a = 0; } }
    return [x, y, a];
  }
  // 候选部件：tailFlame —— 尾尖小火苗（发光体；fl 0 小 · 1 大 · 2 熄灭只剩一点焦黑）
  function tailFlame() {
    part(); const [x0, y0, a] = tailTip(), x = R(x0 - Math.cos(a)), y = Math.min(-1, R(y0 - Math.sin(a)));
    if (P.fl === 2) { U.dot(E, x, y, m.heat, 1); return; }
    U.dot(E, x, y, m.heat, 3); U.dot(E, x, y - 1, m.heat, 4); U.dot(E, x - 1, y, m.heat, 2); U.dot(E, x, y - 2, m.hot, P.fl ? 2 : 1);
    if (P.fl === 1) { U.dot(E, x - 1, y - 1, m.heat, 3); U.dot(E, x + 1, y - 1, m.heat, 2); U.dot(E, x - 1, y - 3, m.heat, 3); U.dot(E, x, y - 1, m.hot, 3); }
  }
  function drawHero() {
    const oo = shp(), lie = rig.lie === 2, L = rig.legs; begin(hero, P.bx, 0);
    const sx = R(rig.wing.x), sy = R(rig.wing.y);
    wyvernWing(sx + 2, sy - 1, P.wf, 1);                                              // 远翼
    if (!lie) Q.leg(E, rig, P, oo, 0);                                                // 远侧后腿（没有前腿：翼就是前肢）
    Q.tail(E, rig, P, oo); tailFlame();
    if (!lie) neckSpikes();
    Q.body(E, rig, P, oo);
    heatSac();
    if (!lie) Q.leg(E, rig, P, oLegN, 2);                                             // 近侧后腿（亮一档）
    wyvernWing(sx, sy, P.wn, 0);                                                      // 近翼
    Q.head(E, rig, P, oo); drakeHorns();
    if (lie) { Q.leg(E, rig, P, oo, 0); Q.leg(E, rig, P, oLegN, 2); }                    // 侧躺：两条后腿僵直伸出
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let mzT = 9, mzX = 0, mzY = 0, chargeAcc = 0, emberAcc = 0, soulAcc = 0, smokeAcc = 0, lastGf = -9, lastSn = -1, restT = 9, restX0 = 0, restX1 = 0, beamT = 9, beamX0 = 0, beamY0 = 0;
  const mouthScr = () => [R(scrX(rig.mouth[0] + P.bx + 1)), HY + R(rig.mouth[1])];
  const tailScr = () => { const t = tailTip(); return [R(scrX(t[0] - 1 + P.bx)), HY + R(t[1]) - 2]; };
  const DX = DUMMY_X, DY = HY - 14;
  function onEnter(s) {
    if (s === CAST) {                                                                 // 低头喷出一道横向火流
      poseAt(CAST, 0.12, E.simT); const [mx, my] = mouthScr();
      releaseOrbit(40, 90, 0.2, 0.45, { pts: 1 });
      beamX0 = mx + 2; beamY0 = my; fx.cross(mx + 2, my, 5, R_EL, 0.2); ring(mx, my, 0, R_EL);
      burst(mx, my, 16, 50, 120, 0.2, 0.45, R_EL, 4); shake(0.28, 2); flash(0.05); beamT = 0; restX0 = mx + 4; restX1 = DX - 6;
      sfx('shoot', { proj: 'fire' });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SPIT) {
      const [mx, my] = mouthScr(); mzT = 0; mzX = mx + 1; mzY = my; shoot(1, mx + 2, my, 150, DX - 3, R_EL, 0, { trail: { every: 1, life: [0.18, 0.35], back: [10, 30] } });
      burst(mx + 1, my, 6, 20, 50, 0.12, 0.3, R_EL, 2); sfx('swing', { kind: 'bite', w: 0.3 }); sfx('shoot', { proj: 'fire' });
    }
    if (s === CAST && t === T_WAVE) {                                                 // 火浪推到目标脚下，把它包住点燃
      fx.wave(DX - 16, FLOOR - 1, 1, 14, 7, R_EL, 0.5, 2); burst(DX, DY, 24, 50, 130, 0.25, 0.6, R_EL, 12);
      dummyFx({ dur: 1.2, tint: R_EL }); hitDummy(1); shake(0.12, 1); restT = 0; sfx('impact', { pal: 'fire', w: 0.5 });
    }
    if (s === DEATH && t === T_FALL) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 14 + Math.random() * 28, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.5 });
    }
  }
  const EVENTS = [[], [], [T_SPIT], [], [T_WAVE], [], [], [T_FALL], []];
  function impactOn(k, x, y) { if (k === 1) { burst(x, y, 12, 30, 90, 0.15, 0.4, R_EL, 8); fx.cross(x, y, 3, R_EL, 0.15); hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.35 }); } }
  function stepFX(dt, state, stT) {
    const [mx, my] = mouthScr();
    if (state === CHARGE && stT > 0.2) {                                              // 火星向嘴螺旋汇聚
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 8, a = Math.random() * 6.2832; spawnX(K_SPIRAL_PT, mx, my, (r - 2) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 6 + Math.random() * 3, tx: mx, ty: my }); }
    }
    if (state === CAST && stT < 0.42) {                                               // 沿途火粒子向前喷
      emberAcc += dt * 70; while (emberAcc >= 1) { emberAcc -= 1; const q = Math.random(); spawn(K_EMBER, lerp(mx, DX - 6, q), lerp(my, HY - 6, q) + (Math.random() - 0.5) * 4, 60 + Math.random() * 60, -10 - Math.random() * 20, 0.2 + Math.random() * 0.25, R_EL); }
    }
    if (restT < 0.8) {                                                                // 地面余火：0.6 s 走完色阶熄灭
      smokeAcc += dt * 30; while (smokeAcc >= 1) { smokeAcc -= 1; spawn(K_EMBER, lerp(restX0, restX1 + 8, Math.random()), FLOOR - 1, (Math.random() - 0.5) * 6, -8 - Math.random() * 10, 0.3 + Math.random() * 0.3, R_EL); }
    }
    if (state === RECOVER && stT < 0.5) { soulAcc += dt * 10; while (soulAcc >= 1) { soulAcc -= 1; spawnX(K_PHYS, mx + 1, my - 1, 4 + Math.random() * 6, -10 - Math.random() * 8, 0.8, R_SMOKE, { g: -6, dragX: 0.6, dragY: 0.8, age0: 0.3 }); } }   // 嘴角冒烟
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) { spawn(K_DUST, scrX(P.gf === 0 ? -1 : -5), HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.25, FXI.dust); spawn(K_DUST, scrX(10), HY, 6, -3, 0.2, FXI.dust); sfx('step', { w: 0.4 }); }
      lastGf = P.gf;
    }
    if (state === IDLE) {                                                             // 鼻孔两缕烟；喷嚏喷出一小团火星
      emberAcc += dt * 2.2; while (emberAcc >= 1) { emberAcc -= 1; spawnX(K_PHYS, mx, my - 2, 3 + Math.random() * 4, -8 - Math.random() * 6, 0.9, R_SMOKE, { g: -4, dragX: 0.6, dragY: 0.8, age0: 0.35 }); }
      const lp = q12(stT) % DUR[IDLE], k = lp >= 1.6 - 1e-6 && lp < 2.0 ? Math.min(4, f12of(lp - 1.6)) : -1;
      if (k === 2 && lastSn !== 2) burst(mx + 2, my, 10, 20, 60, 0.2, 0.4, R_EL, 3);
      lastSn = k;
    }
    if (state === DEATH && stT > T_FALL && stT < INCOMING + 1.8) {                    // 尾焰熄灭：一缕黑烟
      smokeAcc += dt * 12; while (smokeAcc >= 1) { smokeAcc -= 1; const [tx, ty] = tailScr(); spawnX(K_PHYS, tx, ty, (Math.random() - 0.5) * 4, -10 - Math.random() * 6, 1.0, R_SMOKE, { g: -4, dragX: 0.7, dragY: 0.9, age0: 0.55 }); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) {            // 化灰：灰烬飘起
      soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 26, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 8, -12 - Math.random() * 14, 0.8 + Math.random() * 0.6, Math.random() < 0.7 ? R_SMOKE : FXI.soul); }
    }
    restT += dt; beamT += dt; mzT += dt;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; soulAcc = 0; smokeAcc = 0; lastGf = -9; lastSn = -1; restT = 9; beamT = 9; mzT = 9; }
  function fxBack(f12) {
    if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12); shotFloorGlow(f12);
    if (beamT < 0.42 || restT < 0.6) {                                                // 火流映在地上 / 余火：隔点着色，按时间走完色阶
      const q = restT < 9 ? restT / 0.6 : 0, c = q < 0.25 ? EL[1] : q < 0.5 ? EL[2] : q < 0.75 ? EL[3] : EL[4];
      for (let x = R(restX0); x <= R(restX1) + 6; x++) if (((x + f12) & 1) === 0 && (q < 0.5 || ((x >> 1) & 1))) put(x, FLOOR, c);
    }
  }

  // 火流：从嘴到目标脚前的一道 3 格宽横向火柱（芯白黄、边橙红，逐帧抖动），头部 0.08 s 内喷到目标，0.3 s 后断续熄灭
  function fxFront(f12) {
    if (mzT < 2 / 12) {                                                               // 口前枪口光：第 1 帧白黄星芒，第 2 帧缩成橙色
      const big = mzT < 1 / 12, x = mzX, y = mzY;
      put(x, y, EL[0]); put(x + 1, y, EL[0]); put(x + 2, y, EL[1]); put(x + 3, y, big ? EL[1] : EL[2]); put(x + 1, y - 1, EL[1]); put(x + 1, y + 1, EL[1]);
      if (big) { put(x + 4, y, EL[2]); put(x + 1, y - 2, EL[2]); put(x + 1, y + 2, EL[2]); put(x + 2, y - 1, EL[2]); put(x + 2, y + 1, EL[2]); put(x + 3, y - 2, EL[3]); put(x + 3, y + 2, EL[3]); }
    }
    if (beamT >= 0.45) return;
    const x1 = DX - 6, y1 = HY - 7, n = Math.max(1, x1 - beamX0), reach = R(n * clamp01(beamT / 0.08)), late = beamT > 0.3;
    for (let k = 0; k <= reach; k++) {
      const q = k / n, x = beamX0 + k, yc = R(lerp(beamY0, y1, q) + Math.sin(k * 0.7 + f12 * 1.3) * 0.8), hw = q < 0.25 ? 1 : 2;
      for (let o = -hw; o <= hw; o++) {
        const e = Math.abs(o); if (late && ((k + o + f12) & 1)) continue; if (e === hw && ((k * 3 + f12 + o) % 3) === 0) continue;
        put(x, yc + o, e === 0 ? (late ? EL[2] : beamT < 0.15 ? EL[0] : EL[1]) : e === 1 ? (late ? EL[3] : EL[2]) : EL[3]);
      }
    }
    if (!late) { put(beamX0, beamY0, EL[0]); put(beamX0 + 1, beamY0 - 1, EL[1]); put(beamX0 + 1, beamY0 + 1, EL[1]); }
  }

  // 火球：2×2 白黄芯 + 十字 + 3–4 格往后抖的火尾
  function drawShot(k, x, y, d, f12, Rr) {
    if (k !== 1) return false;
    const w = f12 & 1;
    put(x - 4 * d, y - 1 + w, Rr[4]); put(x - 3 * d, y - w, Rr[3]); put(x - 3 * d, y - 1 + w, Rr[4]); put(x - 2 * d, y - 1, Rr[3]); put(x - 2 * d, y, Rr[2]);
    put(x, y - 2, Rr[2]); put(x - d, y - 2, Rr[3]); put(x, y + 1, Rr[2]); put(x - d, y + 1, Rr[3]); put(x + d, y - 1, Rr[2]); put(x + d, y, Rr[2]); put(x + 2 * d, y - w, Rr[1]);
    put(x, y - 1, Rr[0]); put(x - d, y - 1, Rr[0]); put(x, y, Rr[1]); put(x - d, y, Rr[1]);
    return true;
  }

  return {
    name: '幼龙', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.heat, m.hot, m.glow], HIT_POINT, EVENTS,
    REVIVE: { dy: -10, ramp: R_EL },
    SFX: { body: 'beast', how: 'collapse', pal: 'fire', style: 'beam', w: 0.5 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
