// 混沌鼠（敌人 · 混沌 · 普通 · 近战 240）：「数量较少的强力单位。攻击能暴击。」特性「穿刺」：每次攻击，伤害增加 4%，最多叠加 10 次（越打越痛，刀锋）。
// 瘦长贴地的窜鼠：腿短身长、腰细，前半身压低像随时要扑；两只前爪各长出一片向前弯的镰形骨刃（伸出爪前 3 格），
// 背脊一排 10 节小骨刃鳍（对应穿刺的 10 层）从后颈排到尾根，细长鼠尾末端缠着一截断刀片；一只血红独眼，另一侧眉骨上一道疤。
// 和同组邪鼠（站着拿棍）、腐尸鼠（背壳）、已通过的针刺者（背刺射手）拉开：它贴地四足，武器就是爪子。
// 攻击 = 前扑，双爪交叉一撕（两段交叉拖影）；技能「穿刺」= 背上 10 节刃鳍从后往前逐一亮成银白 → 出招前一帧闪白 → X 形双爪交叉斩 → 目标身上一道银色 X 刀痕。
// 移动 = 贴地疾窜（腰身一伸一缩、步子大）；死亡 = 向前扑倒、贴地滑 2 格趴下，骨刃插进地里，尾刀片弹落。
// 身体用 parts-beast 的 quad（rat 头放大到 6·5·3），前爪骨刃、背脊刃鳍、尾刀片、独眼疤自画。
PCD.define('ChaosRat', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, defMat, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_BURST,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round;

  // ───── 元素：穿刺 · 刀锋银（steel：白 → 银 → 灰蓝 → 钢 → 深钢）─────
  const R_EL = FXI.steel, EL = FXR[R_EL];

  // ───── 材质 ─────
  const m = B.mats(E, { main: 'shadow', limb: 'shadow', claw: 'bone', eye: [0, 0, 26, 21], nose: 'pink', teeth: 'bone', glow: [0, 0, 26, 21] });
  const M = {
    blade: defMat('bone', 1), bladeD: defMat([8, 7, 7, 6], 1), edge: defMat('steel', 1),   // 前爪骨刃（远侧暗一级）+ 钢刃口
    fin: defMat('bone', 1), finLit: defMat([29, 30, 31, 21], 1, 1),                         // 刃鳍：骨白 / 亮起时银白（发光体）
    tail: defMat([0, 52, 53, 54], 1), shard: defMat('iron', 1),                             // 鼠尾 + 尾端断刀片
    scar: defMat([0, 54, 60, 17], 1),
  };
  const BASE = { len: 12, chest: 3.5, rump: 3.8, waist: 0.5, hump: 0, leg: 3, lw: 2, thigh: 2, farDx: -2, stride: 3.5, lift: 2, foot: 'claw',
    neck: 1.5, neckA: 0.25, neckW: 2.3, head: { type: 'rat', w: 6, h: 5, snout: 4, snH: 3, tip: 0.45, earH: 2 }, headA: 0.25, tail: 'none', mane: 'none', fur: 1, m };
  const oN = Q.shape(BASE), oL = Q.shape(Object.assign({}, BASE, { len: 13.5 })), oS = Q.shape(Object.assign({}, BASE, { len: 10.5 }));   // 腰身：常态 / 伸 / 缩

  const HX = 70, DUR = DEFAULT_DUR.slice(), hero = new Sprite(100, 44, 54, 40);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of [m.eye, m.ink, m.spec, m.claw, m.glow, m.nose, m.teeth, M.finLit, M.edge, M.shard, M.scar]) RIM.skip[k] = 1;

  // 本角色的姿势字段：fn 亮起的刃鳍数 0–10（从尾根往前）· bl 骨刃 0 平举 / 1 交叉上挑 / 2 插进地里 · gl 刃口闪 · str 腰身 -1 缩 / 0 / 1 伸
  const EXTRA = [['fn', 0, 10], ['bl', 0, 2], ['gl', 0, 1], ['str', -1, 1]];
  const SPEC = Q.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { Q.reset(P); P.pitch = -1; P.fn = 0; P.bl = 0; P.gl = 0; P.str = 0; P.gx = 0; P.gy = 0; }
  reset();
  const shapeOf = () => (P.str > 0 ? oL : P.str < 0 ? oS : oN);
  let o = oN, rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;

  // ───── 背脊刃鳍几何：10 节，从尾根（i = 0）排到后颈（i = 9）─────
  const NF = 10, FH = [3, 3, 4, 4, 4, 4, 4, 4, 3, 3], FXs = new Float32Array(NF), FYs = new Float32Array(NF);
  function finGeom(rg) {
    const x0 = rg.C2.x - rg.C2.r * 0.55, x1 = rg.NB.x - 0.5;
    for (let i = 0; i < NF; i++) { const x = R(x0 + (x1 - x0) * i / (NF - 1)), s = Q.span(rg, o, x); FXs[i] = x; FYs[i] = s ? s[0] : rg.C1.y - 3; }
  }

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'reach', 'paw', 'tail'];
  const REST = { bx: 0, crouch: 0, pitch: -1, head: 0, jaw: 0, reach: 0, paw: 0, tail: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ bx: -1, crouch: 2, pitch: -2, head: 1, tail: -1 });
  const A_TEAR = pose({ bx: 6, pitch: 2, reach: 3, paw: 2, jaw: 2, tail: 2 });
  const A_HOLD = pose({ bx: 5, pitch: 1, reach: 2, paw: 1, jaw: 1, tail: 1 });
  const K_CHG = pose({ bx: -2, crouch: 2, pitch: -2, head: 1, tail: 1 });
  const K_CAST = pose({ bx: 5, pitch: 3, reach: 4, paw: 3, jaw: 3, tail: 2 });
  const tmp = {};
  const apply = (s) => { for (const f of F_ALL) P[f] = R(s[f]); };
  const mixP = (A, Bp, q) => { E.mix(tmp, A, Bp, q, F_ALL); apply(tmp); };
  const T_TEAR = 2 / 12, T_PRE = 1.4 - 1 / 12, T_XHIT = 1 / 12, T_LAND = INCOMING + 0.66;

  function idle(tq, f12) {
    apply(REST); const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.mane = 0;
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = f12of(lp - 1.6); P.paw = k & 1 ? 2 : 1; P.head = 1; P.gl = k & 1; P.ear = 1; }   // 待机个性：近侧骨刃爪抬起，在远侧刃上来回刮（磨刀）
  }
  function deathPose(d, f12) {
    P.eyes = 1; P.ear = 1;
    if (d < 0.3) { apply(pose({ bx: -2, crouch: 1, head: -1, tail: 2 })); P.flash = d < 1 / 12 ? 1 : 0; return; }
    if (d < 0.5) { apply(pose({ bx: 0, crouch: 3, pitch: -3, head: 2, reach: 2, tail: 1 })); P.jaw = 1; return; }   // 往前一栽
    apply(pose({ bx: d < 0.58 ? 1 : 2, head: 2, tail: d < 0.9 ? 1 : 0 })); P.pitch = 0; P.lie = 1; P.jaw = 1; P.bl = 2;   // 扑倒、贴地滑 2 格、骨刃插地
    P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
    const dp = B.dropAt(d, { at: 0.66, dur: 0.3, dx: -9, hop: 5 }); P.drop = dp[0]; P.dsx = dp[1]; P.dsy = dp[2];
    if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { apply(REST); Q.anim.walk(P, tq); P.head = 0; P.mane = 0; P.str = P.gf & 1 ? -1 : 1; const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; }   // 接触帧腰伸长、经过帧缩起
    else if (st === ATTACK) {
      if (tq < 0.12) mixP(REST, A_WIND, ease.out(tq / 0.12));
      else if (tq < T_TEAR - 1e-6) mixP(A_WIND, A_WIND, 0);
      else if (tq < 0.25) { mixP(A_TEAR, A_TEAR, 0); P.bl = 1; P.gl = 1; P.rim = 1; P.str = 1; }
      else if (tq < 0.45) { mixP(A_TEAR, A_HOLD, ease.out((tq - 0.25) / 0.2)); P.bl = 1; }
      else mixP(A_HOLD, REST, ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {
      mixP(REST, K_CHG, ease.inOut(clamp01(tq / 0.7))); P.ear = 1;
      P.fn = Math.min(NF, Math.floor(tq / 0.11 + 1e-6)); P.rim = P.fn >= NF ? 2 : 1;       // 刃鳍从后往前逐节亮起，10 节亮满 → 轮廓光 2 档
      if (tq > 1.1) { P.paw = (f12 & 1) ? 1 : 0; P.gl = f12 & 1; }                          // 亮满后磨两下刀
    } else if (st === CAST) {
      mixP(K_CHG, K_CAST, ease.out(clamp01(tq / 0.1))); P.fn = NF; P.bl = 1; P.gl = 1; P.rim = 3; P.str = 1;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); mixP(K_CAST, REST, q); P.fn = Math.max(0, NF - Math.floor(tq / 0.06 + 1e-6)); P.rim = q < 0.5 ? 2 : 1; P.bl = q < 0.3 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12); else { apply(REST); Q.anim.hurt(P, h); P.mane = 0; if (h < 0.35) P.pitch = 1; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12); else deathPose(d, f12);
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    o = shapeOf(); rig = Q.rig(P, o); finGeom(rig);
    const fi = 5; P.gx = FXs[fi] + P.bx - 1; P.gy = R(FYs[fi]) - FH[fi];                  // 焦点 = 背中段的刃鳍尖（轮廓光、蓄力汇聚）
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：finRidge —— 背脊一排小骨刃鳍（画在躯干之前，只露出背线以上）：每节底 2 格、往后斜的尖，前沿一格亮；lit 节换成银白发光材质
  function finRidge() {
    E.part();
    for (let i = 0; i < NF; i++) {
      const lit = i < P.fn, mat = lit ? M.finLit : M.fin, x = FXs[i], y = FYs[i] + 1, h = FH[i];
      for (let k = 0; k <= h; k++) { const xx = x - R(k * 0.45); U.dot(E, xx, y - k, mat, k === h ? 4 : lit ? 3 : 3); if (k < h - 1) U.dot(E, xx + 1, y - k, mat, lit ? 4 : 2); }
    }
  }
  // 候选部件：sickleBlade —— 前爪上长出的镰形骨刃：从腕部往前平伸、刃尖往下勾，下沿一行钢刃口，伸出爪前 3 格；
  //   mode 0 平举 · 1 上挑（出手）· 2 刃尖朝下插进地里（死亡）；far 远侧暗一级
  function sickleBlade(L, far, mode) {
    const fx = R(L.F[0]), fy = R(L.F[1]), mat = far ? M.bladeD : M.blade, eg = far ? M.bladeD : M.edge;
    if (mode === 2) { U.dot(E, fx + 1, fy - 2, mat, 4); U.dot(E, fx + 2, fy - 2, mat, 3); U.dot(E, fx + 3, fy - 1, mat, 3); U.dot(E, fx + 4, fy, eg, 3); U.dot(E, fx + 3, fy, eg, 2); return; }
    const up = mode === 1 ? -1 : 0;                                         // 刃背骨白（上两行）、刃口钢色（下一行），刃尖往下勾
    const pts = [[0, -3, mat, 4], [1, -4, mat, 4], [2, -4, mat, 4], [3, -5 + up, mat, 4], [4, -5 + up, mat, 4], [5, -5 + up, mat, 3], [6, -4 + up, mat, 3], [7, -3 + up, mat, 3], [7, -2 + up, eg, P.gl ? 4 : 3],
      [1, -3, mat, 3], [2, -3, mat, 3], [3, -4 + up, mat, 3], [4, -4 + up, mat, 3], [5, -4 + up, eg, P.gl ? 4 : 3], [6, -3 + up, eg, P.gl ? 4 : 3],
      [2, -2, eg, 3], [3, -3 + up, eg, 2], [4, -3 + up, eg, 2]];
    for (const [dx, dy, mm, t] of pts) U.dot(E, fx + dx, fy + dy, mm, far && mm === eg ? 2 : t);
  }
  // 候选部件：shardTail —— 细长鼠尾（根部 2 格粗、往后低垂贴近地面、尾尖上翘）+ 末端缠着的一截断刀片（铁色平行四边形，刃口一格亮）
  function shardTail(withShard) {
    E.part();
    const t0 = rig.tail, sw = (P.tail | 0) * 0.12; let x = t0.x, y = t0.y, a = -0.5 + sw;    // a：往后下方（+ 往上），垂到地面后贴地拖着
    for (let k = 0; k < 12; k++) {
      U.dot(E, x, y, M.tail, k < 6 ? 3 : 4); if (k < 3) U.dot(E, x, y + 1, M.tail, 2);
      a += k < 6 ? 0.03 : 0.05 + sw * 0.3; x -= Math.cos(a); y -= Math.sin(a); if (y > -1) { y = -1; }
    }
    shardX = x; shardY = y;
    if (withShard) shard(x, y, 0);
  }
  let shardX = 0, shardY = 0;
  function shard(x, y, flat) {
    x = R(x); y = R(y);
    if (flat) { for (let k = -2; k <= 2; k++) U.dot(E, x + k, y, M.shard, k === 2 ? 4 : 3); U.dot(E, x - 2, y - 1, M.tail, 3); return; }
    U.dot(E, x, y - 1, M.tail, 4); U.dot(E, x + 1, y - 1, M.tail, 3);                      // 缠绕
    U.dot(E, x - 1, y - 2, M.shard, 4); U.dot(E, x - 2, y - 2, M.shard, 3); U.dot(E, x - 2, y - 1, M.shard, 3); U.dot(E, x - 3, y - 1, M.shard, 2); U.dot(E, x - 3, y, M.shard, 2); U.dot(E, x - 4, y, M.shard, 4);
  }
  // 独眼疤：眼后上方一道斜疤（远侧那只眼的位置，侧面只看到眉骨上的疤）
  function scar() {
    const e = rig.eye, x = R(e[0]), y = R(e[1]);
    U.dot(E, x - 2, y - 2, M.scar, 3); U.dot(E, x - 1, y - 1, M.scar, 4); U.dot(E, x - 3, y - 3, M.scar, 2);
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    Q.leg(E, rig, P, o, 0); Q.leg(E, rig, P, o, 1); sickleBlade(rig.legs[1], 1, P.bl);   // 远侧腿 + 远侧骨刃（同一个部件）
    shardTail(!P.drop);
    finRidge();
    Q.body(E, rig, P, o);
    Q.leg(E, rig, P, o, 2); Q.leg(E, rig, P, o, 3);
    Q.head(E, rig, P, o); scar();
    E.part(); sickleBlade(rig.legs[3], 0, P.bl);                            // 近侧骨刃压在下巴前面（头低，爪在吻下）
    if (P.drop) { E.part(); shard(shardX0 + P.dsx, P.drop === 2 ? 0 : shardY0 - P.dsy, P.drop === 2); }
  }
  let shardX0 = 0, shardY0 = 0;
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }
  { poseAt(DEATH, INCOMING + 0.6, 0); begin(hero, 0, 0); shardTail(false); shardX0 = shardX; shardY0 = shardY; reset(); o = oN; rig = Q.rig(P, o); }   // 尾刀片从趴下时的尾尖位置弹落

  // ───── 特效 ─────
  let chargeAcc = 0, soulAcc = 0, lastGf = -9, lastFn = 0, xT = 9, xsT = 9, sparkAcc = 0;
  const XC = [DUMMY_X - 4, HY - 15];
  const bladeScr = () => { const L = rig.legs[3]; return [scrX(R(L.F[0]) + 5 + P.bx), HY + R(L.F[1]) - 3]; };
  function onEnter(s) {
    if (s === CHARGE) lastFn = 0;
    if (s === CAST) {                                                        // X 形双爪交叉斩：两道长斩击弧 + 大十字星芒
      poseAt(CAST, 0, E.simT);
      fx.slash(DUMMY_X - 20, HY + 6, 26, 0.35, 1.1, R_EL, 0.3, 2, 2); fx.slash(DUMMY_X - 20, HY - 36, 26, 2.8, 2.05, R_EL, 0.3, 2, 2);
      fx.cross(XC[0], XC[1], 8, R_EL, 0.3, 2); releaseOrbit(40, 90, 0.2, 0.45, { to: [XC[0], XC[1], 5] });
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_TEAR) {
      xT = 0; burst(XC[0] + 2, XC[1] + 2, 10, 40, 90, 0.12, 0.3, FXI.impact, 8); burst(XC[0], XC[1], 6, 30, 70, 0.15, 0.3, R_EL, 6); hitDummy(0, 1);
      sfx('swing', { kind: 'claw', w: 0.3 }); sfx('hit', { mat: 'flesh', w: 0.3 });
    }
    if (s === CHARGE && t === T_PRE) flash(0.05);                            // 出招前一帧：闪白（暴击感）
    if (s === CAST && t === T_XHIT) {                                        // 命中：银色 X 刀痕 + 钢色外爆 24 + 震屏 1 格
      xsT = 0; burst(XC[0], XC[1], 24, 50, 140, 0.25, 0.55, R_EL, 10); ring(XC[0], XC[1], 0, R_EL); hitDummy(1, 1); shake(0.12, 1);
      dummyFx({ dur: 0.4, outline: R_EL }); sfx('impact', { pal: 'metal', w: 0.6 });
    }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 10 + Math.random() * 28, HY - 1, (Math.random() - 0.3) * 30, -5 - Math.random() * 10, 0.35 + Math.random() * 0.3, FXI.dust);
      const L = rig.legs[3]; burst(scrX(R(L.F[0]) + 4 + P.bx), HY - 1, 5, 20, 50, 0.1, 0.25, R_EL, 10);   // 骨刃插地的火星
      shake(0.1, 1); sfx('fall', { w: 0.3 });
    }
  }
  const EVENTS = [[], [], [T_TEAR], [T_PRE], [T_XHIT], [], [], [T_LAND], []];
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {
      chargeAcc += dt * (8 + 14 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 8 + Math.random() * 6, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
      if (P.fn > lastFn) { for (let i = lastFn; i < P.fn; i++) { const x = scrX(FXs[i] - R(FH[i] * 0.45) + P.bx), y = HY + R(FYs[i]) - FH[i]; fx.cross(x, y - 1, 2, R_EL, 0.2, 2); } lastFn = P.fn; }
    }
    if (P.gl && (state === IDLE || state === CHARGE)) {                    // 磨刀火星
      sparkAcc += dt * 14; while (sparkAcc >= 1) { sparkAcc -= 1; const [x, y] = bladeScr(); spawn(K_BURST, x - 2, y + 1, (Math.random() - 0.3) * 40, -10 - Math.random() * 20, 0.12 + Math.random() * 0.1, R_EL); }
    }
    if (state === MOVE && P.gf !== lastGf) { if (P.gf === 0 || P.gf === 2) sfx('step', { w: 0.2 }); lastGf = P.gf; }   // 轻：没有扬尘
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 22; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 26, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.7, FXI.soul); } }
    xT += dt; xsT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; lastGf = -9; lastFn = 0; xT = 9; xsT = 9; sparkAcc = 0; }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  function diag(x0, y0, x1, y1, c, skip, f12) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) { if (skip && ((k + f12) & 1)) continue; put(R(x0 + (x1 - x0) * k / n), R(y0 + (y1 - y0) * k / n), c); } }
  function fxFront(f12) {
    if (xT < 2 / 12) {                                                       // 攻击：双爪交叉一撕的两段拖影（先右下、后右上，交叉成 X）
      const c = xT < 1 / 12 ? EL[1] : EL[2], late = xT >= 1 / 12, [x, y] = XC;
      diag(x - 6, y - 6, x + 3, y + 3, c, late, f12); if (!late) diag(x - 6, y - 5, x + 3, y + 4, EL[2], false, f12);
      diag(x - 6, y + 4, x + 3, y - 5, c, late, f12);
    }
    if (xsT < 0.55) {                                                        // 技能命中：银色 X 刀痕停 0.4 s，然后闪烁变暗
      if (xsT > 0.4 && (f12 & 1)) return;
      const [x, y] = XC, c = xsT < 0.08 ? EL[0] : xsT < 0.4 ? EL[1] : EL[3], c2 = xsT < 0.4 ? EL[2] : EL[4];
      diag(x - 5, y - 7, x + 5, y + 7, c, false, f12); diag(x - 5, y + 7, x + 5, y - 7, c, false, f12);
      diag(x - 4, y - 7, x + 6, y + 7, c2, false, f12); diag(x - 4, y + 7, x + 6, y - 7, c2, false, f12);
    }
  }

  return {
    name: '混沌鼠', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.finLit, m.eye], HIT_POINT, EVENTS,
    REVIVE: { dy: -7, ramp: 'steel' },
    SFX: { body: 'beast', how: 'topple', pal: 'metal', style: 'blade', w: 0.3 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
