// 龙龟（敌人 · 野兽 · 普通 · 近战 240）：「坚硬的外壳使它成为一个很好的肉盾。」
// 低矮巨壳四足：约 22 格高、34 格长，同组重心最低；高拱的岩青龟壳占身体八成，壳上竖着三排锥形石刺（中排最高，高出壳 4 格），
// 壳沿一圈外翻锯齿，壳面长着苔藓和一株小蕨；龙头长吻、头顶一对后掠短龙角、下颌两撇金色龙须；短粗龙尾，尾尖一簇硬刺；短粗四腿贴地。
// 攻击 = 咬：脖子猛地伸出 3 格一口咬。
// 技能（无特性 → 表现「坚硬的外壳」）：头尾四肢缩进壳，石刺逐排亮起苔绿光、绿叶绕壳旋转 → 三发敌弹连续打在壳上全部弹飞（十字星芒 + 石屑），
//   壳纹闪苔绿 → 头猛地伸出咬住假人（苔绿冲击环 + 叶屑外爆 + 击退）→ 四肢慢慢伸出、抖掉壳上石屑。
// 死亡 = 翻壳碎裂：头尾四肢缩进壳里，壳翻过来肚皮朝天摇两下，然后碎成几块石片，化灰。身体用 parts-beast 的 quad，龟壳 / 石刺 / 蕨 / 尾是自画部件。
PCD.define('DragonTurtle', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_DUST, K_RISE, K_PHYS, K_BURST, K_SPIRAL_PT,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, shoot, death } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, RD = Math.round, CL = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 元素：龟甲 · 苔绿自然（FXI.nature：白 → 淡黄绿 → 叶绿 → 深绿 → 墨绿）─────
  const R_EL = FXI.nature, EL = FXR[R_EL];
  const m = B.mats(E, {
    main: 'moss', belly: 'sand', claw: 'bone', horn: 'bone', eye: [0, 0, 14, 5],
    shell: E.ramp(['#0e1614', '#2a3a34', '#4a6258', '#7a9488']),          // 岩青龟壳（主材质，面积最大）
    spike: 'bone', whisk: 'gold', leaf: 'green',
  });
  m.sglow = E.defMat([36, 37, 38, 21], 1, 1);                       // 石刺的苔绿光（发光体，平涂）
  const SHAPE = { len: 12, chest: 5, rump: 4.5, waist: 0, hump: 0, leg: 3, lw: 3, thigh: 2.6, farDx: -2, stride: 2, lift: 1, foot: 'claw',
    neckA: 0.3, neckW: 2.2, head: { type: 'lizard', w: 7, h: 5.5, snout: 4, snH: 3.5, tip: 0.8, horn: 'back', hornLen: 3, teeth: 2 }, headA: 0.12,
    tail: 'none', mane: 'none', fur: 0, pattern: 'scales', m };
  const NK = [-4.5, -1.5, 1.5, 3, 4.5];                             // 颈长档：0 缩进壳 · 1 探出一点 · 2 平常 · 3 前伸 · 4 咬（猛伸 3 格）
  const SH = NK.map((n) => Q.shape(Object.assign({}, SHAPE, { neck: n })));
  const DUR = DEFAULT_DUR.slice(), hero = new Sprite(88, 40, 42, 34);
  const EXTRA = [['nk', 0, 4], ['tuck', 0, 1], ['sp', 0, 3], ['sfl', 0, 1], ['fern', -1, 1], ['flipS', 0, 1], ['tilt', -1, 1], ['wh', -1, 1]];
  const SPEC = Q.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { Q.reset(P); P.nk = 2; P.tuck = 0; P.sp = 0; P.sfl = 0; P.fern = 0; P.flipS = 0; P.tilt = 0; P.wh = 0; }
  reset();
  let rig = Q.rig(P, SH[2]);
  const HIT_POINT = rig.hit;
  const HX = (() => { const Pb = {}; Q.reset(Pb); return 93 - RD(Q.rig(Pb, SH[4]).mouth[0]) - 4; })();
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 14, 18], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['eye', 'claw', 'horn', 'whisk', 'leaf', 'sglow', 'spike', 'belly', 'limb', 'far', 'body']) RIM.skip[m[k]] = 1;

  // ───── 龟壳几何（和身体同一份 rig）─────
  function shellGeo(rg) {
    const xs = RD(rg.C2.x - rg.C2.r - 1.5), xe = RD(rg.C1.x + rg.C1.r * 0.6 + 1), yr = RD(Math.max(rg.C1.y, rg.C2.y) + 2), H = 12;
    const xm = (xs + xe) / 2, hw = (xe - xs) / 2 + 0.5;
    const top = (x) => { const u = (x - xm) / hw; return Math.abs(u) > 1 ? yr : RD(yr - H * Math.pow(1 - u * u, 0.55)); };
    return { xs, xe, xm, hw, yr, H, top };
  }

  // ───── 姿势 ─────
  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.fern = [0, 1, 0, -1][Math.floor(tq * 2.5 + 1e-6) & 3]; P.wh = P.mane;
    if (lp >= 1.4 - 1e-6 && lp < 2.25) {                            // 待机个性：头慢慢缩进壳里，又伸出来左右看
      const k = f12of(lp - 1.4), NKS = [1, 1, 0, 0, 1, 2, 3, 3, 2, 2], HD = [0, 0, 0, 0, 0, -1, 0, 1, -1, 0];
      P.nk = NKS[CL(k, 0, 9)]; P.head = HD[CL(k, 0, 9)]; P.eyes = P.nk === 0 ? 1 : 0;
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                           // 慢爬：四腿缓慢交替，壳一顿一顿，身体几乎贴地
      Q.anim.walk(P, tq); P.bob = P.gf & 1 ? 0 : 1; P.head = P.gf === 1 ? 1 : 0; P.fern = [1, 0, -1, 0][P.gf]; P.wh = P.fern; P.tail = [-1, 0, 1, 0][P.gf];
      const w = walkDemo(tq, 10, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                       // 咬：脖子猛地伸出 3 格
      if (tq < 2 / 12 - 1e-6) { P.nk = 1; P.crouch = 1; P.head = 1; P.wh = 1; }
      else if (tq < 0.25) { P.nk = 4; P.bx = 4; P.jaw = 3; P.head = 0; P.wh = -1; P.fern = -1; P.tail = -2; }
      else if (tq < 0.45) { P.nk = 3; P.bx = 2; P.jaw = 1; P.wh = -1; }
      else if (tq < 0.58) { P.nk = 3; P.jaw = 0; }
    } else if (st === CHARGE) {                                       // 头尾四肢缩进壳，石刺逐排亮起苔绿光
      P.nk = tq < 0.12 ? 1 : 0; P.tuck = tq >= 0.2 ? 1 : 0; P.crouch = tq < 0.2 ? 1 : 2; P.eyes = 1;
      P.sp = tq < 0.35 ? 0 : tq < 0.6 ? 1 : tq < 0.85 ? 2 : 3; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.fern = (f12 & 2) ? 1 : -1;
      if (tq > 1.1) P.bx = (f12 & 1) ? 1 : 0;
    } else if (st === CAST) {                                         // 敌弹打在壳上全部弹飞，壳纹闪苔绿 → 头猛地伸出咬住假人
      P.sp = 3; P.gem = 3; P.rim = 3;
      if (tq < 4 / 12 - 1e-6) { P.nk = 0; P.tuck = 1; P.crouch = 2; P.eyes = 1; P.sfl = (f12of(tq) & 1) ? 0 : 1; P.fern = (f12 & 1) ? 1 : -1; }
      else { P.nk = 4; P.bx = 4; P.jaw = 3; P.crouch = 1; P.wh = -1; P.gem = 2; P.rim = 2; P.tail = -2; }
    } else if (st === RECOVER) {                                      // 四肢慢慢伸出，抖掉壳上石屑
      const q = ease.inOut(clamp01(tq / 0.55));
      P.nk = tq < 0.15 ? 3 : 2; P.jaw = tq < 0.1 ? 1 : 0; P.bx = tq < 0.15 ? 2 : 0; P.crouch = RD(1 - q);
      P.sp = tq < 0.2 ? 3 : tq < 0.35 ? 2 : tq < 0.5 ? 1 : 0; P.gem = tq < 0.3 ? 2 : tq < 0.5 ? 1 : 0; P.rim = tq < 0.35 ? 2 : 1;
      if (tq >= 0.35 && tq < 0.55) { P.bx = (f12 & 1) ? 1 : -1; P.fern = (f12 & 1) ? 1 : -1; P.wh = P.fern; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); if (h < 0.35) { P.nk = 1; P.fern = 1; P.wh = 1; } }
    } else if (st === DEATH) {                                        // 翻壳碎裂
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = 1; P.nk = 1; P.head = -1; P.fern = 1; P.wh = 1; }
      else if (d < 0.5) { P.bx = -2; P.eyes = 1; P.nk = 0; P.tuck = 1; P.crouch = 2; P.fern = -1; }
      else {
        P.bx = -2; P.flipS = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
        P.tilt = d < 0.66 ? 1 : d < 1.2 ? [-1, 0, 1, 0][Math.floor((d - 0.66) / (2 / 12) + 1e-6) & 3] : 0;
      }
      if (t >= T_BREAK - 1e-6) P.dq = 1;                              // 碎成石片之后由死亡套件画
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, SH[P.nk]);
    const g = shellGeo(rig);
    if (P.flipS) { P.gx = RD(g.xm) + P.bx; P.gy = -8; }
    else if (P.sp || P.gem) { P.gx = RD(g.xm) + P.bx; P.gy = g.top(RD(g.xm)) - 3; }
    else { P.gx = RD(rig.mouth[0]) + P.bx; P.gy = RD(rig.mouth[1]); }
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：turtleTail —— 短粗龙尾：从臀后往后下拖，尾根粗 3 格，尾尖一簇 3 根骨白硬刺（tail 摆动）
  function turtleTail(rg) {
    E.part(); const x0 = rg.tail.x + 1, y0 = rg.tail.y + 1, sw = P.tail | 0;
    const pts = [[x0, y0], [x0 - 3, y0 + 2], [x0 - 5, -2], [x0 - 7, -2 - (sw > 0 ? 1 : 0)]];
    const rr = [1.5, 1.3, 1, 0.7];
    for (let i = 1; i < pts.length; i++) U.taper(E, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], rr[i - 1], rr[i], m.limb, 0);
    const [tx, ty] = pts[3];
    U.dot(E, tx - 2, ty - 1 - (sw < 0 ? 1 : 0), m.spike, 4); U.dot(E, tx - 1, ty - 1, m.spike, 3); U.dot(E, tx - 2, ty, m.spike, 3); U.dot(E, tx - 3, ty, m.spike, 4); U.dot(E, tx - 1, ty - 2, m.spike, 4);
  }
  // 石刺：lit 0 暗 / 1 亮（按 P.gem 取亮度）
  function spike(x, yb, h, lit, far) {
    const mat = far ? m.spikeD || m.spike : m.spike;
    for (let j = 0; j < h; j++) {
      const w = j < h / 2 ? 1 : 0, glowRow = lit && j >= h - 2;
      for (let i = -w; i <= w; i++) U.dot(E, x + i, yb - j, glowRow ? m.sglow : mat, glowRow ? (P.gem >= 3 ? 4 : P.gem === 2 ? 3 : 2) : (j === h - 1 ? 4 : i < 0 ? 4 : far ? 2 : 0));
    }
  }
  const topSpikes = (g) => { const r = []; for (let x = g.xs + 3; x <= g.xe - 3; x += 4) { const u = (x - g.xm) / g.hw; r.push([x, RD(2 + 2 * (1 - Math.abs(u)))]); } return r; };
  // 候选部件：turtleShell —— 高拱龟壳：拱顶（逐列算）+ 甲片缝（中间一道横缝、上下错开的竖缝）+ 外翻锯齿壳沿 + 苔藓斑 + 近侧一排小石刺；sfl 1 = 壳纹闪苔绿
  function shell(rg) {
    const g = shellGeo(rg), yr = g.yr, seamY = (x) => RD(yr - g.H * 0.45);
    E.part();
    for (let x = g.xs; x <= g.xe; x++) {
      const yt = g.top(x), front = x > g.xe - 3 ? x - (g.xe - 3) : 0;
      for (let y = yt; y <= yr - front; y++) {
        let mm = m.shell, t = 0;
        const seam = y === seamY(x) || y === yr - 1 - front || (y < seamY(x) && ((x - g.xs + 40) % 5) === 2) || (y > seamY(x) && y < yr - 1 - front && ((x - g.xs + 40) % 5) === 0);
        if (seam && y > yt) { if (P.sfl) { mm = m.sglow; t = 3; } else t = 2; }
        if ((x === RD(g.xm) - 4 || x === RD(g.xm) - 3) && y === yt + 1) { mm = m.leaf; t = 0; }   // 苔藓斑
        if ((x === RD(g.xm) + 3 && y === yt + 1) || (x === RD(g.xm) + 4 && y === yt + 2) || (x === g.xs + 2 && y === yr - 3)) { mm = m.leaf; t = 2; }
        U.dot(E, x, y, mm, t);
      }
    }
    for (let x = g.xs - 1; x <= g.xe + 1; x++) {                      // 外翻壳沿 + 锯齿
      const front = x > g.xe - 3 ? Math.min(3, x - (g.xe - 3)) : 0, y = yr + 1 - front;
      U.dot(E, x, y, m.shell, ((x + 40) % 3) === 1 ? 4 : 0);
      if (((x - g.xs + 40) % 3) === 0 && x < g.xe - 2) U.dot(E, x, y + 1, m.shell, 2);
    }
    U.dot(E, g.xs - 2, yr, m.shell, 4); U.dot(E, g.xe + 2, yr - 3, m.shell, 4);
    for (let x = g.xs + 4; x <= g.xe - 4; x += 4) spike(x, RD(yr - g.H * 0.3) , 2, P.sp >= 1, 0);   // 近侧一排小石刺（壳面上）
    E.part();
    for (const [x, h] of topSpikes(g)) spike(x, g.top(x) + 1, h + 1, P.sp >= 3, 0);             // 中排最高
  }
  function farSpikes(rg) { const g = shellGeo(rg); E.part(); for (const [x, h] of topSpikes(g)) if (x + 2 < g.xe - 2) spike(x + 2, g.top(x + 2) + 1, h, P.sp >= 2, 1); }
  // 候选部件：fern —— 壳顶的一株小蕨：茎 3 格，叶片左右交替，随 fern 摆
  function fernPlant(rg) {
    const g = shellGeo(rg), x = RD(g.xm) - 6, yb = g.top(x), s = P.fern | 0; E.part();
    U.dot(E, x, yb - 1, m.leaf, 0); U.dot(E, x + (s > 0 ? 1 : 0), yb - 2, m.leaf, 0); U.dot(E, x + s, yb - 3, m.leaf, 4);
    U.dot(E, x - 1, yb - 2, m.leaf, 3); U.dot(E, x + 1 + (s > 0 ? 1 : 0), yb - 3, m.leaf, 3); U.dot(E, x - 1 + s, yb - 4, m.leaf, 4); U.dot(E, x + 2 + s, yb - 2, m.leaf, 2);
  }
  // 下颌两撇金色龙须（紧跟头画，和头同一部件）
  function whiskers(rg, o) {
    const F = Q.headFrame(rg, o, P.jaw), u = F.uT - 2.2, p = F.at(u, F.bot(u) + 0.3), w = P.wh | 0;
    U.dot(E, p[0], p[1] + 1, m.whisk, 4); U.dot(E, p[0] - 1 + (w < 0 ? -1 : 0), p[1] + 2, m.whisk, 3); U.dot(E, p[0] - 2 + (w < 0 ? -1 : w > 0 ? 1 : 0), p[1] + 3, m.whisk, 2);
    U.dot(E, p[0] - 3, p[1] + 1, m.whisk, 3); U.dot(E, p[0] - 4 + (w < 0 ? -1 : 0), p[1] + 2, m.whisk, 2);
  }
  // 候选部件：flippedShell —— 翻过来的龟壳：肚皮（腹甲）朝天、拱顶贴地，壳沿锯齿朝上，两只缩起的脚掌和尾根露出一点；tilt -1/0/1 左右摇
  function flippedShell(lift, tilt) {
    const Pb = {}; Q.reset(Pb); const g = shellGeo(Q.rig(Pb, SH[0])), H = 11, yP = -H - 2 - lift, sh = (x) => RD(tilt * (x - g.xm) / 5);
    E.part();
    for (let x = g.xs; x <= g.xe; x++) {
      const u = (x - g.xm) / g.hw, d = Math.abs(u) > 1 ? 0 : RD(H * Math.pow(1 - u * u, 0.55)), o = sh(x);
      for (let y = yP + 2; y <= yP + 2 + d; y++) U.dot(E, x, y + o, m.shell, (y === yP + 2 + RD(d * 0.5) || ((x - g.xs + 40) % 5) === 0 && y > yP + 3) ? 2 : 0);
    }
    for (let x = g.xs - 1; x <= g.xe + 1; x++) { const o = sh(x); U.dot(E, x, yP + 1 + o, m.shell, ((x + 40) % 3) === 1 ? 4 : 0); if (((x - g.xs + 40) % 3) === 0) U.dot(E, x, yP + o, m.shell, 3); }
    E.part();
    for (let x = g.xs + 2; x <= g.xe - 2; x++) { const o = sh(x); U.dot(E, x, yP + o, m.belly, ((x - g.xs) % 4) === 0 ? 2 : 0); U.dot(E, x, yP - 1 + o, m.belly, ((x - g.xs) % 4) === 0 ? 2 : 4); }
    E.part();
    for (const x of [g.xs + 5, g.xe - 5]) { const o = sh(x); U.dot(E, x, yP - 2 + o, m.limb, 0); U.dot(E, x + 1, yP - 2 + o, m.limb, 0); U.dot(E, x, yP - 3 + o, m.claw, 4); U.dot(E, x + 1, yP - 3 + o, m.claw, 3); }
  }
  function drawHero() {
    begin(hero, P.bx, -P.lift);
    if (P.flipS) { begin(hero, P.bx, 0); flippedShell(P.lift, P.tilt); return; }
    const o = SH[P.nk];
    if (!P.tuck) { Q.leg(E, rig, P, o, 0); Q.leg(E, rig, P, o, 1); turtleTail(rig); }
    farSpikes(rig);
    Q.body(E, rig, P, o);
    if (!P.tuck) { Q.leg(E, rig, P, o, 2); Q.leg(E, rig, P, o, 3); }
    Q.head(E, rig, P, o); if (P.nk) whiskers(rig, o); Q.horn(E, rig, P, o);
    shell(rig);
    fernPlant(rig);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const T_HIT = 2 / 12, T_BITE = 4 / 12, T_SHAKE = 0.35, T_LAND = INCOMING + 0.66, T_BREAK = INCOMING + 1.3;
  const BUL = [[0.04, -14], [0.14, -9], [0.24, -17]];               // 三发敌弹：到达时刻、打在壳上的高度
  let chargeAcc = 0, soulAcc = 0, lastGf = -9, biteT = 9;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const shellFront = () => { const g = shellGeo(rig); return wx(g.xe + P.bx); };
  function onEnter(s) {
    if (s === CHARGE) fx.circle(HX - 1, HY + 1, 16, 3, R_EL, 1.9, 1, 0);
    if (s === CAST) {                                                  // 壳纹闪苔绿，三发敌弹从假人那边连续飞来
      const g = shellGeo(Q.rig(P, SH[0])), tx = wx(g.xe - 1);
      for (const [at, y] of BUL) shoot(0, tx + 320 * at, HY + y, -320, tx, FXI.enemy, 0, { trail: false, glow: -1 });
      fx.cross(wx(RD(g.xm)), HY + g.top(RD(g.xm)) - 4, 6, R_EL, 0.25, 2);
      shake(0.28, 2); flash(0.05);
    }
  }
  function impactOn(k, x, y) {                                          // 敌弹打在壳上弹飞：十字星芒 + 石屑外爆 10 颗 + 弹丸往上弹走
    if (k !== 0) return;
    fx.cross(RD(x), RD(y), 4, R_EL, 0.15, 2);
    for (let i = 0; i < 10; i++) { const a = -Math.PI * (0.15 + Math.random() * 0.7), v = 30 + Math.random() * 60; spawnX(K_PHYS, x, y, Math.cos(a) * v * 0.8 + 10, Math.sin(a) * v, 0.4 + Math.random() * 0.3, FXI.dust, { g: 200, floor: FLOOR }); }
    for (let i = 0; i < 3; i++) spawn(K_BURST, x + 1, y, 60 + Math.random() * 40, -70 - Math.random() * 40, 0.3, FXI.enemy);
    sfx('hit', { mat: 'stone', w: 0.7 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                 // 一口咬住
      biteT = 0; burst(DUMMY_X - 5, HY - 9, 10, 30, 80, 0.15, 0.35, FXI.impact, 8); hitDummy(0);
      sfx('swing', { kind: 'bite', w: 0.8 }); sfx('hit', { mat: 'flesh', w: 0.8 });
    }
    if (s === CAST && t === T_BITE) {                                  // 头猛地伸出咬住假人：苔绿冲击环 + 叶屑外爆 20 颗 + 击退
      biteT = 0; const x = DUMMY_X - 5, y = HY - 9;
      releaseOrbit(50, 100, 0.3, 0.6, { pts: 1, to: [x, y, 4] });
      ring(x, y, 1, R_EL); burst(x, y, 20, 40, 110, 0.3, 0.7, R_EL, 14); fx.cross(x, y, 4, R_EL, 0.2, 2);
      hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'nature', w: 0.9 });
    }
    if (s === RECOVER && t === T_SHAKE) {                              // 抖掉壳上的石屑
      const g = shellGeo(rig);
      for (let i = 0; i < 12; i++) spawnX(K_PHYS, wx(g.xs + Math.random() * (g.xe - g.xs)), HY + g.top(RD(g.xm)) + 2 + Math.random() * 3, (Math.random() - 0.5) * 60, -20 - Math.random() * 30, 0.5 + Math.random() * 0.3, FXI.dust, { g: 220, floor: FLOOR });
    }
    if (s === DEATH && t === T_LAND) {                                 // 翻过来的壳砸地
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 16 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.9 });
    }
    if (s === DEATH && t === T_BREAK) {                                // 碎成几块石片
      poseAt(DEATH, T_BREAK - 1e-3, E.simT); drawHero(); bakeHero();
      death.start('chunks', { chunk: 5, power: 0.5, fromX: -1, fromY: -3, fadeAt: 0.7, fadeDur: 0.6, ramp: FXI.dust });
      burst(HX - 1, HY - 6, 14, 30, 80, 0.3, 0.6, FXI.dust, 12); shake(0.12, 1); sfx('hit', { mat: 'stone', w: 0.9 });
      poseAt(DEATH, T_BREAK, E.simT);
    }
  }
  const EVENTS = [[], [], [T_HIT], [], [T_BITE], [T_SHAKE], [], [T_LAND, T_BREAK], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > 0.3) {                               // 绿叶绕壳旋转
      chargeAcc += dt * (10 + 18 * clamp01(stT / DUR[CHARGE]));
      const g = shellGeo(rig), cx = wx(RD(g.xm) + P.bx), cy = HY + RD(g.yr - g.H * 0.5);
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 20 + Math.random() * 6; spawnX(K_SPIRAL_PT, cx, cy, (r - 13) / 0.4, 0, 1.8 - stT + 0.5, R_EL, { a, r, w: 4, tx: cx, ty: cy, orbitR: 14, orbitW: 4, squash: 0.5 }); }
    }
    if (state === MOVE && P.gf !== lastGf) {                           // 慢爬：每次落脚 2 颗尘土
      if (P.gf === 0 || P.gf === 2) { sfx('step', { w: 0.9 }); for (let i = 0; i < 2; i++) spawn(K_DUST, wx(P.gf === 0 ? 9 : -7) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 14, -3 - Math.random() * 4, 0.3 + Math.random() * 0.2, FXI.dust); }
      lastGf = P.gf;
    }
    if (state === DEATH && stT > T_BREAK && stT < INCOMING + 2.5) {   // 化灰
      soulAcc += dt * 26;
      while (soulAcc >= 1) { soulAcc -= 1; spawnX(K_RISE, HX - 14 + Math.random() * 26, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.7, Math.random() < 0.75 ? FXI.dust : FXI.soul, { age0: 0.2 }); }
    }
    biteT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; lastGf = -9; biteT = 9; }
  function fxBack(f12) { if (P.rim >= 2 && !P.flipS && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); }
  function drawShot(k, x, y, d, f12, R) {                              // 敌弹：2×2 红芯 + 1 格尾
    if (k !== 0) return false;
    put(x, y, R[0]); put(x + 1, y, R[1]); put(x, y + 1, R[1]); put(x + 1, y + 1, R[2]); put(x - d * 2, y, R[2]); put(x - d * 3, y, R[3]);
    return true;
  }
  function fxFront(f12) {
    if (biteT < 2 / 12) {                                               // 咬合拖影：上下两道弧线合拢
      const c = biteT < 1 / 12 ? EL[1] : EL[2], x = DUMMY_X - 6, y = HY - 9;
      for (let k = -3; k <= 3; k++) { if ((k & 1) && biteT >= 1 / 12) continue; put(x + k, y - 3 + RD(k * k / 4), c); put(x + k, y + 3 - RD(k * k / 4), c); }
    }
  }

  return {
    name: '龙龟', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.sglow], HIT_POINT, EVENTS, deathKit: { mode: 'chunks', at: T_BREAK },
    REVIVE: { ramp: R_EL },
    SFX: { body: 'stone', how: 'shatter', pal: 'nature', style: 'shield', w: 0.9 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
