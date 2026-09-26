// 蜥蜴（部队 · 僵尸 · 射手 · 普通）：被电击复活的弗兰肯斯坦式蜥蜴。低伏爬行的死灰石板鳞四足，头大尾长；
// 背上竖一根铜避雷杆（顶端弯钩、缠两圈铜线圈，钩尖跳电火花），长尾末端是铜插头（两根插脚），颈上两颗电极螺栓，身侧一条粗缝合线。
// 攻击：头一缩再猛地前伸，吐出一颗酸绿电火球；技能「发电机 · 越打越快」：尾插头扎进地面充电，电沿尾巴 → 身体 → 避雷杆一路往上爬，
// 避雷杆爆出冲击环后连吐三颗电火球，一发比一发快、第三颗最大，命中后假人被酸绿电弧缠住抽搐。升级 → 宝石蜥蜴。
// 身体用 parts-beast 的 quad（head lizard 放大、tail long）；避雷杆、尾插头、电极螺栓、缝合线、信子在本模块里自绘。
PCD.define('Lizard', (E) => {
  const { Sprite, begin, part, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_STILL, K_BURST,
    spawn, burst, releaseOrbit, shoot, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, hash } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = fxRamp('corpseBolt', [21, 38, 50, 49, 48]), EL = FXR[R_EL];                 // 尸电：白 → 淡黄绿 → 酸绿 → 橄榄 → 墨绿
  const m = B.mats(E, {
    main: [0, 9, 10, 18], belly: 'bone', claw: 'bone', copper: 'leather', tongue: 'blood',          // 死灰石板鳞（stone 提亮一级：原色阶在夜景和远山前是一团暗块，见 design.md）、骨白腹线、铜件
    eye: [0, 0, 50, 50], glow: [38, 38, 38, 38], cloud: [8, 7, 6, 6], spark: [50, 50, 21, 21],
  });
  const o = Q.shape({ len: 12, chest: 3.8, rump: 3.4, waist: 0.15, hump: 0, leg: 3, lw: 2, thigh: 2.2, farDx: -2, stride: 3, lift: 2, foot: 'claw',
    neck: 3, neckA: 0.3, neckW: 2.3, head: { type: 'lizard', w: 7, h: 5.5, snout: 4.5, snH: 3.5, tip: 0.8 }, headA: 0.08,
    tail: 'long', tailLen: 14, tailA: -0.15, tailW: 3.2, tailCurl: 0.12, mane: 'none', fur: 0, pattern: 'scales', lieLegs: 1, m });
  const ROD_H = 8, ROD_DX = -3;                                                              // 避雷杆：肩后 3 格竖起 8 格
  const DROP = { at: 0.45, dur: 0.3, dx: -20, hop: 7 };                                     // 死亡翻身时避雷杆折断，往后甩 20 格落在尾巴旁
  const HX = 34, DUR = DEFAULT_DUR.slice(), hero = new Sprite(92, 46, 52, 40);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 13, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'glow', 'ink', 'spec', 'spark', 'cloud', 'tongue']) RIM.skip[m[k]] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON, [['tongue', 0, 2], ['plug', 0, 1], ['arc', 0, 1]]);   // 移动里「抬起的爪多伸 1 格」只读 gf，已在 Q.KEYS 里
  const P = {}; Q.reset(P); P.tongue = 0; P.plug = 0; P.arc = 0;
  let rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'tail', 'reach', 'gem', 'glow'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, tail: 0, reach: 0, gem: 0, glow: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ bx: -2, crouch: 1, head: -2, pitch: 1, tail: 1, glow: 1 });          // 头一缩（往后上缩、嘴里亮）
  const A_HIT = pose({ bx: 3, pitch: 1, head: 0, reach: 1, jaw: 3, tail: -2, glow: 2 });      // 猛地前伸吐出
  const A_REC = pose({ bx: 2, pitch: 1, head: -1, reach: 1, jaw: 2, tail: -1, glow: 1 });     // 吐完颈往回一缩，嘴里余光减一档
  const A_SET = pose({ bx: 1, jaw: 1 });                                                        // 落回，舔一下嘴（信子）
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_HIT, 'snap'], [0.25, A_HIT, 'lin'], [4 / 12, A_REC, 'snap'], [0.5, A_SET, 'out'], [0.75, REST, 'inOut']];
  const C_GRIP = pose({ crouch: 2, pitch: -1, head: 1, tail: -2, gem: 1 });                  // 四爪抓地压低、尾插头扎地
  // 施放 6 帧：吐（前伸）· 定 · 缩 · 吐 · 缩 · 吐（最大）
  const S_SPIT = pose({ bx: 2, pitch: 1, reach: 1, jaw: 3, tail: -2, gem: 3, glow: 2 }), S_HOLD = pose({ bx: 2, pitch: 1, reach: 1, jaw: 2, tail: -2, gem: 3, glow: 1 });
  const S_BACK = pose({ bx: -1, crouch: 1, head: -1, pitch: 1, tail: -1, gem: 3, glow: 1 }), S_BIG = pose({ bx: 3, pitch: 2, reach: 2, jaw: 3, tail: -2, gem: 3, glow: 3 });
  const CAST_F = [S_SPIT, S_HOLD, S_BACK, S_SPIT, S_BACK, S_BIG];
  const T_HIT = 2 / 12, T_SPIT = [0.05, 0.25, 0.42], SPIT_V = [150, 190, 240];

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    if (lp >= 0.33 - 1e-6 && lp < 0.5) P.gem = 1;                                             // 钩尖偶尔跳一下电火花
    if (lp >= 0.8 - 1e-6 && lp < 1.05) { const k = f12of(lp - 0.8); P.jaw = k < 2 ? 1 : 0; P.tongue = k === 0 ? 1 : k === 1 ? 2 : 1; }   // 吐信
    if (lp >= 1.6 - 1e-6 && lp < 2.0) {                                                        // 待机个性：电抽搐（全身抖 1 帧，电弧沿背从避雷杆跑到尾插头）
      const k = f12of(lp - 1.6); P.arc = 1;
      if (k === 0) { P.bx = 1; P.pitch = 1; P.tail = -2; P.jaw = 1; P.glow = 2; P.gem = 2; }
      else if (k === 1) { P.bx = -1; P.tail = 2; P.gem = 1; }
      else if (k === 3) { P.jaw = 1; P.tongue = 1; }
    }
  }
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  const tmp = {};
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    Q.reset(P); P.tongue = 0; P.plug = 0; P.arc = 0;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                    // 低伏爬行：对角步 + 头尾反向摆
      const f = Q.anim.walk(P, tq); P.tail = [-1, 0, 1, 0][f]; P.head = [1, 0, 0, 0][f];
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F_ALL); apply(tmp); P.rim = tq >= 0.12 && tq < 0.3 ? 1 : 0;
      const f = f12of(tq); if (f === 6) P.tongue = 1; else if (f === 7) P.tongue = 2;              // 吐完舔一下嘴
    }
    else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, REST, C_GRIP, q, F_ALL); apply(tmp);
      P.plug = tq >= 0.3 ? 1 : 0; P.rim = tq < 0.5 ? 1 : 2;
      P.gem = tq < 0.5 ? 1 : tq < 0.9 ? ((f12 & 1) ? 2 : 1) : 2;                                  // 钩尖星芒 1 → 2 档
      P.glow = tq > 0.9 ? 1 : 0; if (tq > 1.1 && (f12 & 1)) P.tail = -1;                         // 蓄满：尾巴跟着电流抽动
    } else if (st === CAST) { apply(CAST_F[Math.min(5, f12of(tq))]); P.plug = 1; P.rim = 3; }
    else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_HOLD, REST, q, F_ALL); apply(tmp);
      P.plug = tq < 0.15 ? 1 : 0; P.tail = tq < 0.15 ? -2 : tq < 0.3 ? 1 : P.tail;                   // 尾巴拔出地面、往上一甩
      P.gem = q < 0.3 ? 2 : q < 0.7 ? 1 : 0; P.rim = q < 0.5 ? 2 : q < 0.8 ? 1 : 0; P.glow = q < 0.4 ? 1 : 0;
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); if (h < 0.2) P.tongue = 1; } }
    else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        Q.anim.death(P, d, f12, DROP);                                                          // 翻肚：塌下 → 侧翻成肚皮朝上、四腿僵直朝天；避雷杆折断甩出
        P.tongue = d >= 0.5 ? 2 : 0; P.gem = d < 0.3 ? ((f12 & 1) ? 2 : 0) : d < 0.66 ? 1 : d < 1.35 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 0.66 && d < 1.4) P.tail = [0, 1, 0, -1][f12 & 3];                                // 抽搐
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.gem = tq > 0.85 ? 2 : 0; }
    rig = Q.rig(P, o);
    if (st === MOVE) for (const L of rig.legs) if (L.up) L.F[0] += 1;                              // 经过帧：抬起的爪再往前伸 1 格（短腿也看得出换脚）
    const g = rodTip(); P.gx = R(g[0]) + P.bx; P.gy = R(g[1]);
    B.key(P, SPEC);
  }

  // ───── 几何 ─────
  function rodBase() { const x = R(rig.C1.x + ROD_DX), s = Q.span(rig, o, x); return [x, s ? s[0] : R(rig.C1.y - rig.C1.r)]; }
  const DROP_BASE = [3, -9];                                                                // 折断时避雷杆的起点（站姿的杆底，本地坐标）
  function rodTip() {
    if (P.drop) { const bx = DROP_BASE[0] + P.dsx; return P.drop === 2 ? [bx + ROD_H + 1, -3] : [bx + 3, DROP_BASE[1] - P.dsy - ROD_H]; }
    const [x, y] = rodBase(); return [x + 3, y - ROD_H + 1];
  }
  function tailPts() {                                                                        // 和 quad.tail 同一套走向（纯几何）：每节圆心，最后一个是尾尖
    const pts = [], n = o.tailLen, sw = (P.tail | 0) * 0.2;
    let x = rig.tail.x, y = rig.tail.y, a = rig.lie === 2 ? -0.05 : o.tailA;
    for (let k = 0; k <= n; k++) { const q = k / n; pts.push([x, y]); a += o.tailCurl * q * 0.35 + sw * (0.25 + q) * 0.35; x -= Math.cos(a); y -= Math.sin(a); if (y > -0.5) { y = -0.5; a = 0; } }
    return pts;
  }
  function mouthLocal() { return [rig.mouth[0] + P.bx, rig.mouth[1]]; }

  // ───── 画 ─────
  // 候选部件：plug（尾端插头：插头座 + 两根平行插脚；down 1 = 竖直扎进地面，只露出插头座）
  function drawPlug(pts, down) {
    part(); const n = pts.length - 1, T = pts[n], Pv = pts[n - 1];
    if (down) {                                                                               // 扎进地面：插头座立在地上，插脚埋进土里
      const x = R(T[0]); U.dot(E, x, -2, m.copper, 4); U.dot(E, x - 1, -2, m.copper, 3); U.dot(E, x, -1, m.copper, 3); U.dot(E, x - 1, -1, m.copper, 2); U.dot(E, x, 0, m.copper, 2); U.dot(E, x - 1, 0, m.copper, 1);
      return;
    }
    let dx = T[0] - Pv[0], dy = T[1] - Pv[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L; const nx = -dy, ny = dx;
    for (let k = 0; k <= 1; k++) for (const s of [-1, 0, 1]) U.dot(E, T[0] + dx * k + nx * s, T[1] + dy * k + ny * s, m.copper, k === 0 ? (s < 0 ? 4 : s > 0 ? 2 : 3) : (s < 0 ? 3 : 2));   // 插头座（3 格宽）
    for (const s of [-1, 1]) for (let k = 2; k <= 3; k++) U.dot(E, T[0] + dx * k + nx * s, T[1] + dy * k + ny * s, m.copper, 4);   // 两根亮铜插脚（中间隔一格暗缝）
  }
  // 候选部件：rod（背负避雷杆：铜底座 + 竖杆 + 两圈线圈 + 前弯的钩；钩尖是发光体，档位读 P.gem）
  function drawRod(bx, by, lay) {
    part();
    if (lay) {                                                                                // 倒在地上：横着一条，钩朝上
      for (let k = 0; k <= ROD_H; k++) U.dot(E, bx + k, -1, m.copper, k === 0 ? 2 : 3);
      U.dot(E, bx - 1, -1, m.copper, 2); U.dot(E, bx - 1, 0, m.copper, 2); U.dot(E, bx, 0, m.copper, 2);
      U.dot(E, bx + 3, -2, m.copper, 4); U.dot(E, bx + 5, -2, m.copper, 4); U.dot(E, bx + 3, 0, m.copper, 2); U.dot(E, bx + 5, 0, m.copper, 2);
      U.dot(E, bx + ROD_H + 1, -2, m.copper, 3); U.dot(E, bx + ROD_H + 2, -3, m.copper, 4); U.dot(E, bx + ROD_H + 2, -4, m.copper, 3);
      U.dot(E, bx + ROD_H + 1, -3, P.gem >= 1 && P.gem < 4 ? m.spark : m.copper, P.gem >= 1 && P.gem < 4 ? 3 : 2);
      return;
    }
    U.dot(E, bx - 1, by, m.copper, 2); U.dot(E, bx, by, m.copper, 3); U.dot(E, bx + 1, by, m.copper, 2);                     // 铜底座（压在背线上）
    U.dot(E, bx - 1, by - 1, m.copper, 4); U.dot(E, bx, by - 1, m.copper, 4); U.dot(E, bx + 1, by - 1, m.copper, 3);
    const yT = by - ROD_H;
    for (let y = by - 2; y >= yT; y--) U.dot(E, bx, y, m.copper, (y & 1) ? 3 : 4);                                          // 竖杆
    for (const y of [by - 4, by - 6]) { U.dot(E, bx - 1, y, m.copper, 4); U.dot(E, bx, y, m.copper, 3); U.dot(E, bx + 1, y, m.copper, 2); }   // 两圈线圈
    U.dot(E, bx, yT - 1, m.copper, 4); U.dot(E, bx + 1, yT - 2, m.copper, 4); U.dot(E, bx + 2, yT - 2, m.copper, 3); U.dot(E, bx + 3, yT - 1, m.copper, 3);   // 前弯的钩
    const lit = P.gem >= 1 && P.gem < 4;
    U.dot(E, bx + 3, yT, lit ? m.spark : m.copper, lit ? 3 : 2);                                                             // 钩尖
    if (P.gem >= 2 && P.gem < 4) U.dot(E, bx + 3, yT + 1, m.glow, 3);
  }
  // 候选部件：neckBolts（颈侧电极螺栓：远侧暗一级，从颈线上斜伸出 1–2 格）
  function drawBolts(far) {
    part(); const NB = rig.NB, NT = rig.NT, mat = far ? m.far : m.copper;
    const q = far ? 0.2 : 0.65, x = NB.x + (NT.x - NB.x) * q - (far ? 1 : 0), y = NB.y + (NT.y - NB.y) * q - o.neckW + 0.3;
    U.dot(E, x, y, mat, 2); U.dot(E, x - 1, y - 1, mat, far ? 2 : 3); U.dot(E, x - 1, y - 2, mat, far ? 3 : 4); U.dot(E, x - 2, y - 2, mat, far ? 2 : 3);
  }
  function stitches() {                                                                       // 与躯干同一个部件：背上一排亮鳞点 + 身侧从肩到胯的粗缝合线（墨线 + 骨白十字针脚）
    const x0 = R(rig.C2.x + 1), x1 = R(rig.C1.x - 1), lie = rig.lie === 2;
    for (let x = R(rig.C2.x - 2); x <= R(rig.C1.x + 1); x++) { const s = Q.span(rig, o, x); if (s && !lie && ((x + 40) % 3) === 0) U.dot(E, x, s[0] + 1 + ((x + 40) % 2), m.body, 4); }
    for (let x = x0; x <= x1; x++) {
      const s = Q.span(rig, o, x); if (!s || s[1] - s[0] < 4) continue;
      const y = R(s[0] + (s[1] - s[0]) * (lie ? 0.35 : 0.5) + Math.sin((x - x0) * 0.5) * 0.4);
      U.dot(E, x, y, m.body, 1);
      if (((x - x0) % 3) === 1) { U.dot(E, x - 1, y - 1, m.belly, 2); U.dot(E, x + 1, y + 1, m.body, 1); U.dot(E, x + 1, y - 1, m.body, 1); U.dot(E, x - 1, y + 1, m.belly, 2); }
    }
  }
  function faceExtras() {                                                                     // 与头同一个部件：远侧浑浊的眼（鼓在头顶）+ 信子
    const F = Q.headFrame(rig, o), u = F.W * 0.35, p = F.at(u + 0.6, F.top(u + 0.6) - 0.4);
    if (!P.eyes && rig.lie !== 2) U.dot(E, p[0], p[1], m.cloud, 3);
    if (P.tongue) {                                                                           // 信子从嘴尖伸出；死亡时耷拉下来
      const t0 = [R(rig.mouth[0]) + 1, R(rig.mouth[1])], L = P.tongue === 2 ? 3 : 2, dead = rig.lie === 2;
      for (let k = 0; k < L; k++) U.dot(E, t0[0] + k, t0[1] + (dead && k > 0 ? 1 : 0), m.tongue, k === 0 ? 2 : 3);
      if (P.tongue === 2 && !dead) { U.dot(E, t0[0] + L, t0[1] - 1, m.tongue, 4); U.dot(E, t0[0] + L, t0[1] + 1, m.tongue, 3); }
    }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const lieUp = rig.lie === 2;
    if (!lieUp) Q.legs(E, rig, P, o, 1);
    if (rig.lie !== 2) drawBolts(1);
    Q.tail(E, rig, P, o); drawPlug(tailPts(), P.plug);
    Q.body(E, rig, P, o); stitches();
    if (!lieUp) Q.legs(E, rig, P, o, 0);
    if (!P.drop) { const [x, y] = rodBase(); drawRod(x, y, 0); }
    if (rig.lie !== 2) drawBolts(0);
    Q.head(E, rig, P, o); faceExtras();
    if (lieUp) { Q.legs(E, rig, P, o, 1); Q.legs(E, rig, P, o, 0); }
    if (P.drop) { const bx = DROP_BASE[0] + P.dsx; if (P.drop === 2) drawRod(bx, 0, 1); else drawRod(bx, DROP_BASE[1] - P.dsy, 0); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, soulAcc = 0, emberAcc = 0, lastGf = -9, mzT = 9, mzX = 0, mzY = 0, nHit = 0, castT = 9, recT = 9, deadT = 9, climbF = -1;
  const tipScr = () => [scrX(P.gx), HY + P.gy];
  const mouthScr = () => { const p = mouthLocal(); return [scrX(R(p[0])), HY + R(p[1])]; };
  const TX = DUMMY_X - 3, TY = HY - 15;
  function spit(k, v) {                                                                       // 从嘴里吐一颗电火球（略往上，打在假人身上）
    const [x, y] = mouthScr(), vy = (TY - y) * v / Math.max(8, TX - x);
    shoot(k, x + 2, y, v, TX, R_EL, vy, { trail: { every: 2, life: [0.08, 0.18], back: [10, 24], off: 3 } });
    mzT = 0; mzX = x + 1; mzY = y; burst(x + 1, y, k === 0 ? 10 : 6, 30, 70, 0.12, 0.3, R_EL, 0);
  }
  function onEnter(s) {
    if (s === CHARGE) nHit = 0;
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [gx, gy] = tipScr();
      releaseOrbit(40, 90, 0.3, 0.6); burst(gx, gy, 26, 50, 120, 0.25, 0.6, R_EL, 8); ring(gx, gy, 0, R_EL); fx.cross(gx, gy, 6, R_EL, 0.3);
      shake(0.28, 2); flash(0.05); castT = 0;
    }
    if (s === RECOVER) recT = 0;
    if (s === DEATH) deadT = 9;
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) { spit(1, 170); sfx('swing', { kind: 'bite', w: 0.3 }); sfx('shoot', { proj: 'orb' }); }
    if (s === CAST && T_SPIT.includes(t)) { const i = T_SPIT.indexOf(t); spit(i === 2 ? 0 : 2, SPIT_V[i]); sfx('shoot', { proj: 'orb' }); }
    if (s === DEATH && t === INCOMING + 0.66) {
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 18 + Math.random() * 34, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.35 });
    }
    if (s === DEATH && T_LEGZAP.includes(t)) {                                               // 电火花在朝天的腿间跳三次
      const i = T_LEGZAP.indexOf(t), L = rig.legs, a = L[3].F, b = L[i === 1 ? 0 : 1].F;
      const ax = scrX(R(a[0]) + P.bx), ay = HY + R(a[1]), bx = scrX(R(b[0]) + P.bx), by = HY + R(b[1]);
      fx.bolt(ax, ay, bx, by, R_EL, 0.14 - i * 0.02, 2, 3 + i); burst((ax + bx) / 2, (ay + by) / 2, 5 - i, 20, 50, 0.1, 0.25, R_EL, 6);
    }
    if (s === DEATH && t === T_ROD_LAND) sfx('hit', { mat: 'metal', w: 0.2 });
  }
  const T_LEGZAP = [INCOMING + 0.8, INCOMING + 1.02, INCOMING + 1.22], T_ROD_LAND = Math.ceil((INCOMING + DROP.at + DROP.dur) * 12 - 1e-6) / 12;
  const EVENTS = [[], [], [T_HIT], [], T_SPIT, [], [], [INCOMING + 0.66, T_ROD_LAND].concat(T_LEGZAP), []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 8, 30, 80, 0.12, 0.3, R_EL, 8); fx.cross(x, y, 4, R_EL, 0.18); hitDummy(0, 1); sfx('hit', { mat: 'magic', w: 0.3 }); return; }
    nHit++; const big = k === 0;                                                              // 技能：三次小十字 + 锯齿短弧，第三发最大
    fx.cross(x, y, big ? 7 : 4, R_EL, big ? 0.3 : 0.2); burst(x, y, big ? 22 : 10, 40, big ? 130 : 90, 0.15, big ? 0.55 : 0.35, R_EL, 10);
    fx.bolt(x - 6, y - 8 + nHit * 3, x + 5, y + 6 - nHit * 2, R_EL, 0.12, 2, 11 + nHit);
    hitDummy(big ? 1 : 0, 1); if (big) { ring(x, y, 1, R_EL); shake(0.12, 1); dummyFx({ dur: 1.3, outline: R_EL, slow: 0.6 }); }
    sfx('impact', { pal: 'bolt', w: big ? 0.45 : 0.25 + nHit * 0.05 });
  }
  function hurtFx(s) {                                                                        // 僵尸肉：火花里夹着骨灰，再漏一点电
    const hx = HX + HIT_POINT[0], hy = HY + HIT_POINT[1];
    burst(hx, hy, s === DEATH ? 16 : 10, 50, 120, 0.2, 0.5, FXI.impact, 18); burst(hx, hy, s === DEATH ? 12 : 7, 20, 60, 0.35, 0.7, FXI.dust, 6); burst(hx, hy - 2, 4, 40, 90, 0.1, 0.25, R_EL, 12);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  // 蓄力：电从插头沿尾巴 → 身体 → 避雷杆一路往上爬（路径按当前姿势算，屏幕坐标）
  function climbPath() {
    const T = tailPts(), n = T.length - 1, [rx, ry] = rodBase(), p = [];
    for (let k = n; k >= 0; k -= 2) p.push([T[k][0], T[k][1] - 1]);
    p.push([rig.C2.x, rig.C2.y - rig.C2.r + 1], [rx - 2, ry - 1], [rx, ry - 3], [rx, ry - ROD_H], [rx + 3, ry - ROD_H + 1]);
    return p.map(([x, y]) => [scrX(R(x) + P.bx), HY + R(y)]);
  }
  function along(p, q) { const n = p.length - 1, f = clamp01(q) * n, i = Math.min(n - 1, Math.floor(f)), r = f - i; return [p[i][0] + (p[i + 1][0] - p[i][0]) * r, p[i][1] + (p[i + 1][1] - p[i][1]) * r]; }
  function zig(a, b, seed, c1, c2) {                                                         // 短锯齿电弧（3 段折线）
    let px = a[0], py = a[1];
    for (let k = 1; k <= 3; k++) { const t = k / 3, j = k === 3 ? 0 : (hash(seed, k) - 0.5) * 4, nx = a[0] + (b[0] - a[0]) * t + j * 0.5, ny = a[1] + (b[1] - a[1]) * t + j; const L = Math.max(1, Math.ceil(Math.max(Math.abs(nx - px), Math.abs(ny - py)))); for (let s = 0; s <= L; s++) put(R(px + (nx - px) * s / L), R(py + (ny - py) * s / L), (k & 1) ? c1 : c2); px = nx; py = ny; }
  }
  function stepFX(dt, state, stT) {
    const [gx, gy] = tipScr();
    if (state === CHARGE && stT > 0.35) {                                                     // 钩尖汇聚
      chargeAcc += dt * (12 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 9 + Math.random() * 7, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if (state === CHARGE && stT >= 0.3 && stT < 0.3 + dt) { const x = scrX(R(tailPts()[o.tailLen][0]) + P.bx); burst(x, HY - 1, 8, 20, 50, 0.2, 0.4, FXI.dust, 12); burst(x, HY - 1, 6, 30, 60, 0.1, 0.3, R_EL, 14); }   // 插头扎地
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) { spawn(K_DUST, scrX(P.gf === 0 ? 9 : -6) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 14, -3 - Math.random() * 5, 0.25 + Math.random() * 0.15, FXI.dust); sfx('step', { w: 0.2 }); }
      lastGf = P.gf;
    }
    if (state === IDLE && P.gem >= 1) { emberAcc += dt * 10; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx, gy - 1, Math.random() * 10 - 5, -8 - Math.random() * 8, 0.3 + Math.random() * 0.3, R_EL); } }
    if (state === RECOVER && stT < 0.5) { emberAcc += dt * 6; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx, gy - 1, Math.random() * 10 - 5, -8 - Math.random() * 8, 0.3 + Math.random() * 0.3, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 30, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_EL); } }
    mzT += dt; castT += dt; recT += dt; deadT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; emberAcc = 0; lastGf = -9; mzT = 9; nHit = 0; castT = 9; recT = 9; deadT = 9; climbF = -1; }
  function fxBack(f12) {
    if (P.rim >= 2 && !rig.lie) floorGlow(scrX(P.gx), P.rim, EL, f12);
    if (P.plug && P.dq < 1) { const x = scrX(R(tailPts()[o.tailLen][0]) + P.bx); for (let d = -4; d <= 4; d++) if (Math.abs(d) < 2 || ((d + f12) & 1) === 0) put(x + d, FLOOR, Math.abs(d) < 2 ? EL[1] : Math.abs(d) < 3 ? EL[2] : EL[3]); }   // 插头扎地的地面映光
    shotFloorGlow(f12);
  }
  function fxFront(f12) {
    const st = E.state, [gx, gy] = tipScr();
    if (P.gem >= 2 && P.gem <= 3 && !rig.lie && P.dq < 1) {                                  // 钩尖十字星芒
      const L = P.gem === 3 ? 5 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = P.gem === 3 ? (r <= 2 ? EL[0] : r <= 4 ? EL[1] : EL[2]) : (r === 2 ? EL[1] : EL[2]); put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); }
    } else if (P.gem === 1 && !rig.lie && ((f12 >> 1) & 1)) put(gx, gy - 1, EL[1]);
    if (st === CHARGE && E.stT >= 0.35 && P.dq < 1) {                                         // 电沿尾巴 → 身体 → 避雷杆往上爬（两趟，第二趟更快）+ 线圈火花越转越快
      const p = climbPath(), t = E.stT - 0.35, q = t < 0.6 ? t / 0.6 : clamp01((t - 0.6) / 0.35), c = along(p, q), b = along(p, Math.max(0, q - 0.14));
      zig(b, c, f12 * 7 + 3, EL[0], EL[1]); put(R(c[0]), R(c[1]), EL[0]);
      const [rx, ry] = rodBase(), cx = scrX(rx + P.bx), cy = HY + ry - 5, sp = 0.6 + 2.2 * clamp01(t / 1.0), ph = E.stT * sp * 12;
      for (let k = 0; k < 2; k++) { const a = ph + k * Math.PI; put(R(cx + Math.cos(a) * 2), R(cy + Math.sin(a) * 1.2), k ? EL[2] : EL[0]); }
    }
    if (st === IDLE && P.arc && P.dq < 1) {                                                   // 待机电抽搐：一道小电弧沿背从避雷杆跑到尾插头
      const p = climbPath().reverse(), lp = q12(E.stT) % DUR[IDLE], q = clamp01((lp - 1.6) / 0.33), c = along(p, q), b = along(p, Math.max(0, q - 0.2));
      zig(b, c, f12 * 5 + 1, EL[1], EL[2]); put(R(c[0]), R(c[1]), EL[0]);
    }
    if (st === RECOVER && recT < 0.5 && ((f12 >> 1) & 1) === 0 && recT > 0.15) zig([gx, gy], [gx + 3 - (f12 & 2) * 2, gy - 4], f12 * 3, EL[1], EL[2]);   // 余火花噼啪两下
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; put(mzX, mzY, EL[0]); for (let r = 1; r <= 2; r++) { put(mzX + r, mzY, c); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } }
  }
  function drawShot(k, x, y, d, f12, Rr) {                                                    // 电火球：2×2（第三颗 3×3）白芯 + 酸绿壳 + 锯齿拖尾
    const big = k === 0, s = big ? 2 : 1;
    for (let i = -s; i <= s; i++) for (let j = -s; j <= s; j++) { const e = Math.abs(i) + Math.abs(j); if (e > s + 1) continue; put(x + i, y + j, e === 0 || (big && e === 1 && i >= 0) ? Rr[0] : e <= s ? Rr[1] : Rr[2]); }
    if (!big) { put(x, y, Rr[0]); put(x + d, y, Rr[0]); put(x, y - 1, Rr[1]); put(x + d, y - 1, Rr[0]); }
    let py = y; for (let k2 = 1; k2 <= (big ? 8 : 6); k2++) { py = y + (((k2 + f12) & 1) ? -1 : 1) * (k2 > 1 ? 1 : 0); put(x - d * (s + k2), py, k2 < 3 ? Rr[1] : k2 < 5 ? Rr[2] : Rr[3]); }
    if (f12 & 1) { put(x + d * (s + 1), y - s - 1, Rr[1]); put(x - d, y + s + 1, Rr[2]); } else { put(x + d * (s + 1), y + s + 1, Rr[1]); put(x - d, y - s - 1, Rr[2]); }
    return true;
  }

  return {
    name: '蜥蜴', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.eye, m.glow, m.spark], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'bolt', style: 'buff', w: 0.3 },
    REVIVE: { dy: -8, ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, hurtFx, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
