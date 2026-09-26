// 蜜熊（敌人 · 野兽 · 稀有）：圆滚短腿熊档——约 28×22 格，胸臀都圆、没有肩峰、腿短粗，像一颗蜜糖橘棕的毛球；
// 识别：背上藤绳绑一只大陶蜜罐（罐口朝上高出背线 6 格、罐沿溢出的蜂蜜往下滴）、罐口绕飞 4 只小蜜蜂（飞出身体轮廓）、胸前奶油色月牙太阳熊斑、嘴角和右前掌沾着金蜜。
// 攻击 = 砸（前身抬起，用沾蜜的前掌拍下）；技能 = 特性「蜜罐」（死亡时为身边受伤的友军回血）：坐起抱罐 → 举罐过头 → 砸地罐碎，金蜜飞向每名友军化作治疗十字。
// 死亡 = 侧倒碎罐：侧躺倒下，背上的蜜罐甩出摔碎，金蜜溅开一大滩（死亡即技能：友军回血），蜜蜂四散。身体用 parts-beast 的 quad。
PCD.define('HoneyBear', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_PHYS, K_BURST, K_EMBER,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, allyPoints, allyFx, bayer } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, PI = Math.PI;

  // ───── 元素：蜜罐 · 金蜜治疗（FXI.holy：白 → 淡金白 → 金 → 暗金 → 棕）─────
  const R_EL = FXI.holy, EL = FXR[R_EL];
  const FUR = E.ramp(['#2a1406', '#6a3410', '#a8601e', '#d8963a']);
  const m = B.mats(E, {
    main: FUR, muz: 'sand', eye: [0, 0, 0, 0], nose: [0, 0, 0, 0], claw: [0, 20, 20, 19],
    pot: [0, 20, 20, 19], potHi: 'wood', rim: 'gold', rope: 'sand', bee: [0, 0, 14, 5], ink: 'ink',
  });
  m.far = E.defMat([FUR[0], FUR[1], FUR[1], FUR[2]], 1, 1);                   // 远侧两条腿：暗一级平涂，不再被躯干压一整条分界线
  m.moon = E.defMat('bone', 1, 1); m.honey = E.defMat('gold', 1, 1);           // 胸斑、蜂蜜：平涂，后画的部件不会把它们压成勾线色
  m.hglow = E.defMat([14, 5, 51, 21], 1, 1);                                   // 罐口的蜜光（发光体，平涂，按档取色调）
  const SHAPE = { len: 10, chest: 5.5, rump: 5.2, waist: 0, hump: 0, leg: 4, lw: 3, thigh: 3.2, farDx: -2, stride: 2, lift: 2,
    neck: 1.5, neckA: 0.2, neckW: 3.5, head: { type: 'bear', w: 7, h: 6, snout: 2.6, snH: 3.5, tip: 0.85, earH: 2 }, headA: 0.2,
    tail: 'stub', foot: 'pad', mane: 'none', fur: 0, m };
  const o = Q.shape(SHAPE);
  const HX = 72, DUR = DEFAULT_DUR.slice(), hero = new Sprite(96, 60, 48, 54);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 13, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'nose', 'claw', 'ink', 'spec', 'moon', 'pot', 'potHi', 'rim', 'rope', 'honey', 'bee', 'hglow']) RIM.skip[m[k]] = 1;
  // 本角色的姿势字段：pot 蜜罐 0 背着 / 1 抱在胸前 / 2 举过头 / 3 碎了 / 4 不见 / 5 甩出去 · pl 蜜光 0–3 · bee 蜜蜂相位 0–7 · bees 蜜蜂在不在
  //   drip 罐沿蜜滴长度 0–3 · lick 舔掌 · shk 发抖 · pdx pby 甩出的罐（x 偏移、罐底 y）
  const EXTRA = [['pot', 0, 5], ['pl', 0, 3], ['bee', 0, 7], ['bees', 0, 1], ['drip', 0, 3], ['shk', -1, 1], ['pdx', -24, 8], ['pby', -24, 0]];
  const SPEC = Q.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { Q.reset(P); P.pot = 0; P.pl = 0; P.bee = 0; P.bees = 1; P.drip = 0; P.shk = 0; P.pdx = 0; P.pby = 0; }
  reset();
  const HIT_POINT = Q.rig(P, o).hit;
  let rig = Q.rig(P, o);

  // ───── 蜜罐几何 ─────
  const PX = -1;                                                               // 背上罐子所在的列
  const POT_W = [2, 3, 4, 4, 3, 2, 1, 2];                                      // 自下而上每行半宽（罐底 → 圆腹 4 行 → 罐肩 → 罐颈 → 外翻罐沿）
  const ROPE = [[-3, 4], [-2, 4], [-1, 3], [0, 3], [1, 2], [2, 2], [3, 1]];    // 斜绑在罐腹上的藤绳：[x, 行]，1 格粗，左上 → 右下
  function potBack(rg) { const s = Q.span(rg, o, PX); return [PX, (s ? s[0] : -12) + 1]; }   // [罐心 x, 罐底 y]
  function potPos(rg) {
    if (P.pot === 1) return [R(rg.C1.x + rg.C1.r + 7), 0];                   // 坐着抱住放在身前地上的罐子
    if (P.pot === 2) return [R(rg.head.x - 1), R(rg.head.y - rg.head.Hh - 2)]; // 举过头顶
    if (P.pot === 5) return [PX + P.pdx, P.pby];
    return potBack(rg);
  }
  const mouthOf = (pp) => [pp[0], pp[1] - 8];
  function hugLegs(rg) {                                                       // 抱罐 / 举罐：两只前掌贴在罐子两侧
    if ((P.pot !== 1 && P.pot !== 2) || rg.lie) return;
    const pp = potPos(rg);
    for (const L of rg.legs) { if (!L.front) continue; L.F = [pp[0] + (L.far ? 3 : -4), pp[1] - (L.far ? 5 : 3)]; L.up = true; }
  }

  // ───── 姿势 ─────
  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.bee = Math.floor(tq * 6 + 1e-6) & 7; P.drip = Math.floor(tq * 2.5 + 1e-6) % 4;
    if (lp >= 1.4 - 1e-6 && lp < 2.2) {                                       // 待机个性：坐下舔前掌上的蜂蜜，抬头咂嘴
      const k = f12of(lp - 1.4); P.pitch = k === 0 || k === 9 ? 2 : 4; P.crouch = k === 0 || k === 9 ? 1 : 2; P.bob = 0;
      if (k >= 1 && k <= 5) { P.paw = 3; P.head = 2; P.jaw = (k & 1) ? 1 : 0; P.eyes = 1; }
      else if (k >= 6 && k <= 8) { P.head = -2; P.jaw = k === 7 ? 1 : 0; }
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                    // 摇摆慢走：圆身体左右晃，罐子跟着晃
      Q.anim.walk(P, tq); P.bee = Math.floor(tq * 6 + 1e-6) & 7; P.drip = P.gf === 1 ? 2 : P.gf === 3 ? 1 : 0;
      P.mane = P.gf === 0 ? 1 : P.gf === 2 ? -1 : 0; P.head = P.gf === 0 ? 1 : P.gf === 2 ? -1 : 0;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                // 前身抬起，沾蜜的前掌拍下
      P.bee = f12 & 7;
      if (tq < 1 / 12 - 1e-6) { P.crouch = 1; P.head = 1; }
      else if (tq < 2 / 12 - 1e-6) { P.pitch = 4; P.paw = 3; P.head = -1; P.jaw = 2; P.mane = 1; P.tail = 1; }
      else if (tq < 0.25) { P.bx = 4; P.pitch = -2; P.reach = 3; P.crouch = 1; P.head = 1; P.jaw = 1; P.mane = -1; P.tail = -2; P.drip = 3; }
      else if (tq < 0.45) { P.bx = 3; P.pitch = -1; P.reach = 2; P.crouch = 1; P.head = 1; P.drip = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); P.bx = R(3 * (1 - q)); P.reach = R(2 * (1 - q)); P.drip = 1; }
    } else if (st === CHARGE) {                                                // 坐起抱罐 → 举过头顶，蜜光越来越亮、蜜蜂越飞越快
      P.bee = f12 & 7; P.rim = 2;
      if (tq < 0.35) { const q = ease.inOut(tq / 0.35); P.pitch = R(4 * q); P.crouch = R(2 * q); P.head = 1; P.pl = 1; }
      else if (tq < 1.1) { P.pot = 1; P.pitch = 3; P.crouch = 2; P.head = 1; P.pl = tq < 0.8 ? 1 : ((f12 & 1) ? 2 : 1); P.tail = 1; }
      else { P.pot = 2; P.pitch = 6; P.crouch = 1; P.head = -2; P.jaw = 1; P.pl = 2; P.shk = (f12 & 1) ? 1 : -1; P.tail = 2; }
    } else if (st === CAST) {                                                  // 双掌举罐砸地，罐碎
      P.pot = 3; P.bx = 3; P.pitch = -2; P.crouch = 2; P.reach = 3; P.head = 2; P.jaw = 2; P.pl = 3; P.rim = 3; P.bees = 0; P.tail = -2;
      if (tq >= 0.25) { P.pitch = -1; P.jaw = 1; P.head = 1; P.rim = 2; }
    } else if (st === RECOVER) {                                               // 舔掌上的蜜；地上的蜜滩慢慢变暗消失，背上换回一只满罐
      const q = ease.inOut(clamp01(tq / 0.6)); P.bx = R(3 * (1 - q)); P.rim = tq < 0.3 ? 1 : 0;
      if (tq < 0.45) { P.pot = 4; P.bees = 0; P.paw = 3; P.head = 2; P.jaw = (f12 & 1) ? 1 : 0; P.pitch = 2; P.crouch = 1; }
      else { P.bee = f12 & 7; P.pl = tq < 0.55 ? 1 : 0; }
    } else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); P.bee = (f12 * 3) & 7; P.drip = 3; if (h < 0.2) P.mane = -1; }
    } else if (st === DEATH) {                                                 // 侧倒碎罐
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        Q.anim.death(P, d, f12); P.bee = (f12 * 3) & 7; P.drip = 3;
        if (d >= 0.5) {                                                         // 罐子从背上甩出去，往后落地摔碎
          const q = clamp01((d - 0.5) / 0.16); P.pot = q >= 1 ? 3 : 5; P.pdx = R(-12 * q); P.pby = R(-11 * (1 - q) - Math.sin(q * PI) * 5); P.bees = q >= 1 ? 0 : 1;
        }
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o); hugLegs(rig);
    const mo = P.pot === 3 || P.pot === 4 ? [R(rig.C1.x + 7), -2] : mouthOf(potPos(rig));
    P.gx = mo[0] + P.bx; P.gy = mo[1];
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：honeyPot（大陶蜜罐，wood 色阶：罐底 → 暗段圆腹 → 亮段罐肩 1 行 → 罐颈 → gold 外翻罐沿；罐腹斜绑 1 格藤绳；
  //   罐口冒出一汪金蜜（中间是蜜光发光体，按档亮），一条蜜流从罐沿沿罐腹往下挂 3 格，再挂一滴会伸长的蜜滴）
  function pot(cx, by, sway) {
    E.part();
    for (let k = 0; k < POT_W.length; k++) {
      const y = by - k, w = POT_W[k], dx = k >= 4 ? sway : 0;
      for (let x = -w; x <= w; x++) {
        if (k === 7) U.dot(E, cx + x + dx, y, m.rim, x === -w ? 4 : x === w ? 2 : 3);           // 外翻罐沿（金）
        else if (k === 5) U.dot(E, cx + x + dx, y, m.potHi, x === w ? 3 : 4);                   // 罐肩高光（wood 亮段）
        else U.dot(E, cx + x + dx, y, m.pot, 0);                                                // 罐身（wood 暗段，自动明暗）
      }
    }
    for (const [x, k] of ROPE) U.dot(E, cx + x + (k >= 4 ? sway : 0), by - k, m.rope, 3);   // 斜绑藤绳
    const mx = cx + sway, lv = P.pl;
    U.dot(E, mx, by - 8, m.hglow, lv >= 3 ? 4 : lv === 2 ? 3 : lv === 1 ? 2 : 1); U.dot(E, mx - 1, by - 8, m.honey, 4); U.dot(E, mx + 1, by - 8, m.honey, 3);   // 罐口冒出的蜜
    U.dot(E, mx + 2, by - 6, m.honey, 4); U.dot(E, mx + 3, by - 5, m.honey, 3); U.dot(E, mx + 3, by - 4, m.honey, 3); U.dot(E, cx + 4, by - 3, m.honey, 3);   // 溢出的蜜沿罐腹往下挂
    for (let j = 0; j < P.drip; j++) U.dot(E, cx + 4, by - 2 + j, m.honey, j === P.drip - 1 ? 4 : 3);                       // 挂着的蜜滴
  }
  // 候选部件：beeSwarm（绕罐口飞的小蜜蜂：金身 + 墨条纹 2 格，椭圆轨道按相位转，飞出身体轮廓）
  function bees(cx, cy) {
    if (!P.bees) return; E.part();
    for (let i = 0; i < 4; i++) {
      const a = (P.bee / 8) * 2 * PI + i * PI / 2 + (i & 1) * 0.4, x = R(cx + Math.cos(a) * (6 + (i & 1))), y = R(cy - 2 + Math.sin(a) * 3);
      const dir = Math.sin(a) > 0 ? -1 : 1; U.dot(E, x, y, m.bee, 3); U.dot(E, x + dir, y, m.ink, 1); if ((P.bee + i) & 1) U.dot(E, x, y - 1, m.bee, 4);   // 身 + 条纹 + 翅
    }
  }
  function shards(cx) {                                                        // 碎罐片（和一截罐沿）躺在地上
    E.part();
    [[-4, 0, 0], [-3, 0, 0], [-3, -1, 4], [-1, 0, 0], [1, 0, 0], [2, 0, 0], [2, -1, 0], [3, -1, 4], [5, 0, 0], [6, 0, 2]].forEach(([dx, dy, t]) => U.dot(E, cx + dx, dy, m.pot, t));
  }
  function bodyMarks() {                                                       // 和躯干同一个部件：捆罐的藤绳（接罐腹斜绳的下端，绕到腹下）
    if (rig.lie === 2 || P.pot !== 0) return;
    const s = Q.span(rig, o, PX + 3); if (s) for (let y = s[0] + 1; y <= s[1] - 1; y++) U.dot(E, PX + 3 + (y > s[0] + 4 ? 1 : 0), y, m.rope, (y & 1) ? 2 : 3);
  }
  function sunMoon() {                                                         // 和近侧前腿同一个部件：胸前奶油色月牙（太阳熊斑），贴在前腿根前沿、头下，弧口朝上
    if (rig.lie) return;
    const T = rig.legs[3].T, x0 = R(T[0]), y0 = R(T[1]);
    for (const [dx, dy, t] of [[1, -1, 3], [2, 0, 4], [3, 0, 4], [4, -1, 3]]) U.dot(E, x0 + dx, y0 + dy, m.moon, t);
  }
  function honeyFace() {                                                       // 和头同一个部件：嘴角沾的蜜（挂下来一滴）
    if (rig.lie === 2) return;
    const F = Q.headFrame(rig, o, P.jaw), u = F.uT - 1.5, p = F.at(u, F.prof(u)[2] + 1);
    U.dot(E, p[0], p[1], m.honey, 4); U.dot(E, p[0] - 1, p[1] + 1, m.honey, 3); U.dot(E, p[0] - 1, p[1] + 2, m.honey, 3);
  }
  function pawHoney() {                                                        // 和近侧前腿同一个部件：右前掌上糊着的蜜
    const L = rig.legs[3]; if (rig.lie === 2) return;
    U.dot(E, L.F[0] + 1, L.F[1] - 1, m.honey, 4); U.dot(E, L.F[0] + 2, L.F[1] - 2 + (L.up ? 0 : 1), m.honey, 3); U.dot(E, L.F[0], L.F[1] - 2, m.honey, 3);
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const lieLegs = rig.lie === 2, held = P.pot === 1 || P.pot === 2;
    if (P.pot === 3) shards(rig.lie ? PX - 12 : R(rig.C1.x + 7));
    if (!lieLegs) { Q.leg(E, rig, P, o, 0); Q.leg(E, rig, P, o, 1); }
    Q.tail(E, rig, P, o);
    Q.body(E, rig, P, o); bodyMarks();
    if (!lieLegs) { Q.leg(E, rig, P, o, 2); if (!held) { Q.leg(E, rig, P, o, 3); pawHoney(); sunMoon(); } }
    if (P.pot === 0) { const pp = potBack(rig); pot(pp[0], pp[1], (P.mane | 0) + (P.shk | 0) > 0 ? 1 : (P.mane | 0) + (P.shk | 0) < 0 ? -1 : 0); }
    Q.head(E, rig, P, o); honeyFace();
    if (held) { Q.leg(E, rig, P, o, 3); pawHoney(); sunMoon(); const pp = potPos(rig); pot(pp[0], pp[1], P.shk); }   // 前掌在罐后抱住，罐子整只露出来
    if (P.pot === 5) pot(PX + P.pdx, P.pby, 0);
    if (lieLegs) { Q.legs(E, rig, P, o, 1); Q.legs(E, rig, P, o, 0); }
    if (P.pot !== 3 && P.pot !== 4) { const mo = mouthOf(potPos(rig)); bees(mo[0], mo[1]); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const ALLY_X = [HX - 30, HX - 44];
  let chargeAcc = 0, soulAcc = 0, lastGf = -9, swT = 9, pudT = 9, pudX = 0, pudW = 0, pudDur = 1.2, nStep = 0;
  const mouthScr = () => [scrX(P.gx), HY + P.gy];
  function honeyBurst(x, y, n, v) { for (let i = 0; i < n; i++) { const a = -PI * (0.05 + Math.random() * 0.9), s = v * (0.4 + Math.random() * 0.8); spawnX(K_PHYS, x, y, Math.cos(a) * s, Math.sin(a) * s, 0.7 + Math.random() * 0.5, R_EL, { g: 220, floor: HY }); } }
  function potShards(x, y) { for (let i = 0; i < 8; i++) { const a = -PI * (0.1 + Math.random() * 0.8), s = 40 + Math.random() * 50; spawnX(K_PHYS, x, y, Math.cos(a) * s, Math.sin(a) * s, 0.5 + Math.random() * 0.3, FXI.impact, { g: 260, floor: HY }); } }
  function healAllies(delay) {                                                  // 每名友军头上落下一颗金蜜滴
    for (const p of allyPoints()) spawnX(K_PHYS, p.x + 1, p.top - 14 - delay * 30, 0, 10, 0.55, R_EL, { g: 240, floor: p.top - 1, sz: 2 });
  }
  function healHit() {                                                          // 金蜜滴落到头上：金描边 + 十字形上升光点
    allyFx({ dur: 1.2, outline: R_EL });
    for (const p of allyPoints()) {
      fx.cross(p.x, p.top - 3, 3, R_EL, 0.35, 2); burst(p.x, p.top - 2, 6, 15, 40, 0.2, 0.4, R_EL, 6);
      for (let k = 0; k < 3; k++) { const x = p.x - 4 + k * 4, y = p.mid - k * 3; for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) spawn(K_RISE, x + dx, y + dy, 0, -12, 0.9, R_EL); }
    }
    shake(0.12, 1); sfx('impact', { pal: 'holy', w: 0.5 });
  }
  function onEnter(s) {
    E.allies(s === DEATH ? 1 : null);
    if (s === CAST) {                                                           // 双掌举罐砸地：罐碎 → 金蜜外爆（带重力落地成滩）+ 冲击环
      poseAt(CAST, 0, E.simT); const x = scrX(R(rig.C1.x + 7) + P.bx), y = HY - 2;
      releaseOrbit(40, 90, 0.4, 0.7, { kind: K_PHYS, g: 200, floor: HY, at: [x, y], up: 30 });
      honeyBurst(x, y, 30, 90); potShards(x, y); ring(x, y, 1, R_EL); fx.cross(x, y - 2, 6, R_EL, 0.25, 2);
      for (let i = 0; i < 4; i++) spawnX(K_BURST, x, y - 6, (Math.random() - 0.5) * 80, -30 - Math.random() * 30, 0.8, R_EL);   // 蜜蜂四散
      pudT = 0; pudX = x; pudW = 8; pudDur = 1.4; healAllies(0);
      shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'holy', w: 0.6 });
    }
  }
  const T_HIT = 2 / 12, T_HEAL = 0.3, T_POT = INCOMING + 0.66, T_DHEAL = INCOMING + 0.95, T_REPOT = 0.45;
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                          // 沾蜜的前掌拍下
      swT = 0; const F = rig.legs[3].F, x = Math.min(scrX(R(F[0]) + P.bx) + 2, DUMMY_X - 4), y = HY + R(F[1]) - 2;
      burst(DUMMY_X - 4, HY - 10, 10, 30, 90, 0.15, 0.35, FXI.impact, 8); honeyBurst(DUMMY_X - 4, HY - 10, 6, 50);
      spawnX(K_PHYS, x, y, 26, -34, 0.9, R_EL, { g: 200, floor: HY, sz: 2 }); spawnX(K_PHYS, x - 2, y + 1, 14, -48, 0.9, R_EL, { g: 200, floor: HY, sz: 2 });   // 掌上的蜜甩出 2 颗
      hitDummy(0); sfx('swing', { kind: 'claw', w: 0.6 }); sfx('hit', { mat: 'flesh', w: 0.6 });
    }
    if (s === CAST && t === T_HEAL) healHit();
    if (s === RECOVER && t === T_REPOT) { const pp = potBack(rig); burst(scrX(pp[0] + P.bx), HY + pp[1] - 4, 10, 20, 50, 0.2, 0.4, R_EL, 8); }
    if (s === DEATH && t === T_POT) {                                           // 侧躺落地，罐子摔碎：金蜜溅开一大滩、蜜蜂四散、友军回血
      const x = scrX(PX - 12 + P.bx), y = HY - 2;
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 12 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust);
      honeyBurst(x, y, 34, 100); potShards(x, y); ring(x, y, 1, R_EL);
      for (let i = 0; i < 4; i++) spawnX(K_BURST, x, y - 8, (Math.random() - 0.5) * 90, -30 - Math.random() * 30, 0.9, R_EL);
      pudT = 0; pudX = x; pudW = 11; pudDur = 2.1; healAllies(0);
      shake(0.1, 1); sfx('fall', { w: 0.7 }); sfx('impact', { pal: 'holy', w: 0.6 });
    }
    if (s === DEATH && t === T_DHEAL) healHit();
  }
  const EVENTS = [[], [], [T_HIT], [], [T_HEAL], [T_REPOT], [], [T_POT, T_DHEAL], []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = mouthScr();
    if (state === CHARGE) {                                                     // 金色光点螺旋汇进罐口
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 11 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if (state === MOVE && P.gf !== lastGf) {                                    // 摇摆慢走：每步 1–2 颗尘，隔一步从罐沿滴一滴蜜在地上
      if (P.gf === 0 || P.gf === 2) {
        nStep++; sfx('step', { w: 0.6 });
        for (let i = 0; i < 2; i++) spawn(K_DUST, scrX(P.gf === 0 ? 8 : -6) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 14, -3 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust);
        if (nStep & 1) { const pp = potBack(rig); spawnX(K_PHYS, scrX(pp[0] + 4), HY + pp[1] - 2, 0, 5, 1.0, R_EL, { g: 160, floor: HY, age0: 0.15 }); }
      }
      lastGf = P.gf;
    }
    if (state === IDLE && P.drip === 3 && Math.random() < dt * 3) { const pp = potBack(rig); spawnX(K_PHYS, scrX(pp[0] + 4 + P.bx), HY + pp[1] - 1, 0, 5, 0.9, R_EL, { g: 160, floor: HY, age0: 0.2 }); }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 26, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    swT += dt; pudT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; lastGf = -9; swT = 9; pudT = 9; nStep = 0; E.allies(null); }
  function fxBack(f12) {
    if (P.rim >= 2 && !P.lie && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12);
    if (pudT < pudDur) {                                                        // 金蜜滩：亮金 → 金 → 暗金 → 棕，最后按抖动消失
      const q = pudT / pudDur, c = q < 0.2 ? 1 : q < 0.5 ? 2 : q < 0.75 ? 3 : 4;
      for (let x = -pudW; x <= pudW; x++) {
        const e = Math.abs(x) / pudW; if (q > 0.75 && bayer(x + 64, 1) < (q - 0.75) / 0.25 + e * 0.3) continue;
        put(pudX + x, FLOOR, EL[Math.min(4, c + (e > 0.75 ? 1 : 0))]); if (e < 0.55) put(pudX + x, HY, EL[Math.min(4, c + (e > 0.3 ? 1 : 0))]);
        if (c <= 2 && ((x + f12) % 5) === 0 && e < 0.6) put(pudX + x, HY, EL[0]);
      }
    }
  }
  function fxFront(f12) {
    if (P.pl >= 2 && (P.pot === 1 || P.pot === 2) && P.dq < 1) {              // 蜜光十字
      const [gx, gy] = mouthScr(), L = 3 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r === 2 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); }
    }
    if (swT < 2 / 12) {                                                         // 拍下的掌风：从举起的高处到假人前，三道竖痕
      const first = swT < 1 / 12, x0 = HX + 4 + R(rig.legs[3].F[0]) - 1, c = first ? EL[1] : EL[2];
      for (let k = 0; k < 3; k++) for (let j = -9; j <= -1; j++) { if (!first && ((j + k) & 1)) continue; put(x0 + k * 2 + (j < -5 ? -1 : 0), HY + j, c); }
    }
  }

  return {
    name: '蜜熊', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.hglow], HIT_POINT, EVENTS, ALLIES: 'skill', ALLY_X,
    SFX: { body: 'beast', how: 'topple', pal: 'holy', style: 'heal', w: 0.6 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
