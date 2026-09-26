// 公鸡（部队 · 不死 · 先锋 · 优质 · 近战 256）：雏鸡进化成的挺胸重装飞禽——身体竖起、胸甲前凸，
// 三根呆毛长成 5 齿大锯齿鸡冠 + 肉垂，三根镰刀长尾羽拱过头顶，脚后各一根前弯的长钢爪距，
// 铜钱长成圆形铜钱护心镜（方孔、铆边），翅膀外层是鳞片状钢羽甲，空眼窝里是钢白色魂火。
// 攻击：振翅后仰 → 前冲双腿前蹬，爪距划出两道向下的弧；技能「偏转」：两翼在胸前合成羽甲盾挡下三支敌箭，双翼猛张把箭弹回，钉进假人脚前。
// 死亡：翅膀垂落，从空中直直摔到地上，侧翻爪距朝天，钢羽甲片弹开，魂火熄灭后化灰（死亡套件 ash）。由雏鸡升级。
// 身体用 parts-beast 的 fly 骨架（rig、身体）；甲片翼、羽甲盾、镰尾、距腿、锯齿冠、护心镜、倒地姿是本模块的部件。
PCD.define('Rooster', (E) => {
  const { Sprite, begin, part, sp, bake, ease, clamp01, keys, mix, q12, f12of, gait, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, clearOrbit, ring, shake, flash, fx, death, sfx, hitDummy, dummyFx, put, scrX, floorGlow, groundShadow } = E;
  const B = E.parts.beast, F = B.fly, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 材质 ─────
  const R_EL = FXI.steel, EL = FXR[R_EL], R_EN = FXI.enemy, EN = FXR[R_EN];               // 偏转 · 钢羽银白：21 白 → 31 → 30 → 29 → 28
  const m = B.mats(E, { main: 'pale', steel: 'steel', comb: 'crimson', leg: 'bone', spur: [0, 29, 30, 31], beak: 'sand', coin: 'gold',
    eye: [27, 30, 31, 21], glow: [31, 31, 21, 21] });                                        // eye 平涂：tone 1 熄 · 2 钢灰 · 3 钢白 · 4 白
  m.steelFar = E.defMat(E.RAMP.steel, 1, 0, 1); m.plate = E.defMat([27, 28, 29, 30], 1); m.lit = E.defMat([27, 29, 30, 31], 1);   // 远翼暗一级；甲片亮起时换亮一级的色阶
  const o = F.shape({ alt: 6, rx: 5.5, ry: 4.5, head: 'bird', hr: 3, tail: 'none', wing: { span: 12, chord: 5, type: 'feather', fingers: 4 }, legLen: 6, m });
  const LIFT0 = 4, PITCH0 = -2, HOP = 10;                                                              // alt 6 + 4 = 身体离地 10、脚尖离地 3–4 格（悬停，读得出在飞）；身体竖起（胸在前上）

  const HX = 74, DUR = DEFAULT_DUR.slice(), hero = new Sprite(72, 52, 34, 46);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 14, 18], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['eye', 'glow', 'ink', 'comb', 'coin', 'leg', 'spur', 'beak', 'body']) RIM.skip[m[k]] = 1;
  const SPEC = F.KEYS.concat(B.COMMON, [['hdx', -2, 2], ['comb', -1, 2], ['wat', -1, 1], ['kick', 0, 2], ['lstep', -1, 1], ['shield', 0, 2], ['lit', 0, 6], ['eyeLv', 0, 4], ['glint', 0, 1], ['wshake', 0, 1]]);
  const P = {};
  function reset() { F.reset(P); P.hdx = 0; P.comb = 0; P.wat = 0; P.kick = 0; P.lstep = 0; P.shield = 0; P.lit = 0; P.eyeLv = 1; P.glint = 0; P.wshake = 0; P.lift = LIFT0; P.pitch = PITCH0; P.legs = 1; }
  reset();
  let rig = F.rig(P, o);
  const hd = { x: 0, y: 0, r: 3 };
  function build() { rig = F.rig(P, o); const C = rig.C; hd.x = C.x + 5 + P.hdx; hd.y = C.y - 8.5 + P.head; }
  build();
  const HIT_POINT = [1, R(rig.C.y)];
  const eyeAt = () => [R(hd.x + 1), R(hd.y - 0.5)];
  const chestAt = () => { const C = rig.C, p = U.toW(C.x, C.y, C.a, rig.rx * 0.82, 0.2); return [p[0] + 1, p[1]]; };   // 护心镜中心（前凸 1 格）

  // ───── 姿势 ─────
  const F_ALL = ['lift', 'pitch', 'head', 'hdx', 'jaw', 'bx', 'kick', 'comb', 'wat'];
  const REST = { lift: LIFT0, pitch: PITCH0, head: 0, hdx: 0, jaw: 0, bx: 0, kick: 0, comb: 0, wat: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ lift: LIFT0 + 2, pitch: -2, head: -1, hdx: -1, bx: -2, comb: 1, wat: 1 });                   // 振翅后仰蓄势
  const A_KICK = pose({ lift: LIFT0 + 1, pitch: -2, head: 0, hdx: 0, bx: 8, kick: 2, comb: -1, wat: -1 });            // 前冲、双腿前蹬
  const A_HOLD = pose({ lift: LIFT0, pitch: -1, bx: 7, kick: 1, comb: 1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_KICK, 'snap'], [0.25, A_KICK, 'lin'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_GUARD = pose({ lift: 0, pitch: -1, head: 1, hdx: -1, comb: 2 });                                   // 落低、缩头在盾后、鸡冠竖起
  const S_OPEN = pose({ lift: LIFT0 + 1, pitch: -2, head: -1, hdx: 0, jaw: 1, comb: -1, wat: -1 });                  // 双翼猛张
  const T_HIT = 2 / 12, T_A = [0, 0.08, 0.16], T_OPEN = 4 / 12, T_FALL = INCOMING + 0.66, T_ASH = INCOMING + 1.5;
  const ARROW_V = 360, T_ARRIVE = [0.125, 0.205, 0.285], LSTEP_I = [0, 1, 0, -1], LSTEP_M = [1, 0, -1, 0];
  const tmp = {};
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  function flap(f12) { const f = (f12 >> 1) & 3; P.gf = f; P.bob = B.FLAP_BOB[f]; }
  function idle(tq, f12) {
    flap(f12); P.lstep = LSTEP_I[P.gf]; P.wat = P.gf === 2 ? 1 : 0;
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 - 1e-6 && lp < 2.0) {                                                     // 待机个性：挺胸打鸣（仰头张喙，冠和肉垂甩，护心镜一闪）
      const k = f12of(lp - 1.6); P.head = -1; P.hdx = k < 3 ? -1 : 0; P.jaw = k === 0 ? 1 : 2; P.comb = (k & 1) ? 1 : -1; P.wat = (k & 1) ? -1 : 1; P.glint = k === 1 || k === 2 ? 1 : 0; P.pitch = -2; P.bob = 0; P.gf = -1; P.wing = 5;
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                 // 低空重扑翼：翼大开大合，起伏 2 格，下沉时爪距掠地
      const f = gait(tq); P.gf = f; P.bob = B.FLAP_BOB[f]; P.pitch = -1; P.lift = [LIFT0 - 2, LIFT0 - 1, LIFT0, LIFT0 - 1][f]; P.lstep = LSTEP_M[f]; P.comb = f === 0 ? 1 : f === 2 ? -1 : 0; P.wat = -P.comb;   // 下沉那一拍脚尖贴地
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F_ALL); apply(tmp);
      if (tq < 0.12) { P.gf = -1; P.wing = 1; } else if (tq < 0.25) { P.gf = -1; P.wing = 3; P.rim = 1; } else flap(f12);
    } else if (st === CHARGE) {                                                             // 两翼向前合拢成盾，钢羽从翼根到翼尖逐片亮银
      const q = ease.inOut(clamp01(tq / 0.7)); mix(tmp, REST, C_GUARD, q, F_ALL); apply(tmp);
      P.lift = q > 0.6 ? 0 : q > 0.4 ? 1 : q > 0.2 ? 2 : LIFT0 - 1; P.comb = q > 0.5 ? 2 : 0;
      P.gf = -1; P.wing = 4; P.shield = q < 0.3 ? 0 : q < 0.65 ? 1 : 2; P.legs = 0;
      P.lit = tq < 0.6 ? 0 : Math.min(6, 1 + Math.floor((tq - 0.6) / 0.12)); P.eyeLv = tq < 0.45 ? 1 : ((f12 & 1) ? 3 : 2); P.rim = 2;
      if (tq > 1.1) P.bx = -(f12 & 1);                                                      // 顶住：微微发抖
      P.mx = -R(HOP * ease.out(clamp01(tq / 0.5)));                                         // 扑翅往后跳开，给来箭留出距离
    } else if (st === CAST) {
      if (tq < T_OPEN) {                                                                    // 盾挡三箭：每支撞上时往后一顿
        apply(C_GUARD); P.lift = 0; P.gf = -1; P.wing = 4; P.shield = 2; P.lit = 6; P.legs = 0; P.eyeLv = 3;
        let since = 9; for (const h of T_ARRIVE) if (tq >= h - 1e-6) since = tq - h; if (since < 0.08) { P.bx = -1; P.comb = 1; P.wat = 1; }
      } else { mix(tmp, C_GUARD, S_OPEN, ease.out(clamp01((tq - T_OPEN) / 0.08)), F_ALL); apply(tmp); P.gf = -1; P.wing = 5; P.eyeLv = 3; }
      P.rim = 3; P.mx = -HOP;
    } else if (st === RECOVER) {                                                            // 抖一抖翅膀收回，打半声鸣
      const q = ease.inOut(clamp01(tq / 0.6)); mix(tmp, S_OPEN, REST, q, F_ALL); apply(tmp);
      if (tq < 0.34) { P.gf = -1; P.wing = (f12 & 1) ? 4 : 5; P.wshake = f12 & 1; } else flap(f12);
      if (tq >= 0.42 && tq < 0.55) { P.jaw = 1; P.head = -1; }
      P.eyeLv = q < 0.4 ? 2 : 1; P.rim = q < 0.4 ? 2 : 0; P.mx = -R(HOP * (1 - q));      // 滑翔回原位
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0 || h >= 0.35) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.eyes = 1; P.eyeLv = 0; P.gf = -1; P.wing = 1; P.pitch = 0; P.head = -1; P.hdx = -1; P.comb = 1; P.wat = 1; P.kick = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else { P.bx = -1; P.eyes = 1; P.eyeLv = 0; P.gf = -1; P.wing = 4; P.pitch = -1; P.comb = -1; P.wat = -1; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.eyes = 1; P.eyeLv = (f12 & 1) ? 2 : 0; P.gf = -1; P.wing = 1; P.pitch = 0; P.head = -1; P.comb = 1; P.wat = 1; P.kick = 1; P.flash = d < 1 / 12 ? 1 : 0; }
      else if (d < 0.66) {                                                                  // 翅膀垂落，直直摔下（离地 8 → 0）
        const q = (d - 0.3) / 0.36; P.lie = 1; P.lift = Math.max(0, R((o.alt + LIFT0) * (1 - q * q))); P.bx = -2; P.gf = -1; P.wing = 6; P.pitch = 1; P.eyes = 1; P.eyeLv = 0; P.comb = -1; P.wat = -1; P.head = 1;
      } else {
        P.lie = 2; P.bx = -2; P.eyes = 1;
        P.eyeLv = d < 0.9 ? ((f12 & 1) ? 2 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;          // 魂火闪几下熄灭
        P.lift = d < 0.74 ? 1 : 0;                                                          // 撞地弹一下
        if (d >= 1.5) P.dq = 1;                                                             // 化灰（死亡套件 ash）
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    build();
    if (P.lie === 2) { P.gx = 9 + P.bx; P.gy = -3; }
    else if (P.shield) { const c = chestAt(); P.gx = R(c[0]) + 3 + P.bx; P.gy = R(c[1]); }
    else { const e = eyeAt(); P.gx = e[0] + P.bx; P.gy = e[1]; }
    B.key(P, SPEC);
  }

  // ───── 画：部件 ─────
  // 候选部件：armorWing 甲片翼——外形同 B.wing 的羽翼（翼面 + 初级飞羽从腕部扇开 + 亮前缘），翼面上叠两排鳞片状甲片（亮上沿 + 暗下沿，逐排错开）。
  //   (x, y) 翼根；W = B.WINGS[翼姿] 或自定义 [臂角, 翼尖角, 收拢]；w = { span, chord, fingers }；mat 甲片材质。一个部件。
  function armorWing(x, y, W, w, mat) {
    part();
    const a0 = W[0], aT = W[1], fold = W[2], span = w.span, nf = w.fingers, arm = span * (0.42 - 0.14 * fold), wx = x - Math.cos(a0) * arm, wy = y - Math.sin(a0) * arm;
    let lx = 0, ly = 0;
    for (let k = 0; k < nf; k++) {
      const q = k / (nf - 1), fa = a0 + (aT - a0) * (0.25 + 0.75 * q), fl = span * (0.62 - 0.12 * q) * (1 - 0.55 * fold), tx = wx - Math.cos(fa) * fl, ty = wy - Math.sin(fa) * fl;
      U.seg(E, wx, wy, tx, ty, 2, mat, 0); U.dot(E, tx, ty, mat, 4); if (k === nf - 1) { lx = tx; ly = ty; }
    }
    const bx = x - w.chord * (1 - 0.3 * fold), by = y + 1, mx = lerp(lx, bx, 0.5), my = lerp(ly, by, 0.5) + 1;
    U.poly(E, [x, y, wx, wy, lx, ly, mx, my, bx, by], mat, 0);
    U.seg(E, x, y, wx, wy, 2, mat, 4);                                                      // 前缘（亮）
    for (let r = 1; r <= 2; r++) for (let s = 1; s <= 4; s++) {                             // 鳞片：翼面双线性取点，逐排错开
      const u = (s - (r & 1) * 0.5) / 4.5, v = r / 3, ax = lerp(x, wx, u), ay = lerp(y, wy, u), cx = lerp(bx, mx, u), cy = lerp(by, my, u);
      const px = lerp(ax, cx, v), py = lerp(ay, cy, v); U.dot(E, px, py, mat, 4); U.dot(E, px, py + 1, mat, 2);
    }
  }
  // 候选部件：plateShield 羽甲盾——两翼向前合拢挡在胸前：以 (cx, cy) 为心的月牙（半径 r0–r1、角度 a0–a1，0 朝前、+ 朝下），
  //   按角度分成 n 片甲片，每片上沿亮、下沿暗；lit 片（从翼根 = 上端开始）换亮材质。一个部件。
  function plateShield(cx, cy, r0, r1, a0, a1, n, mat, litMat, lit) {
    part();
    const x0 = Math.floor(cx - r1 - 1), x1 = Math.ceil(cx + r1 + 1), y0 = Math.floor(cy - r1 - 1), y1 = Math.min(0, Math.ceil(cy + r1 + 1));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx); if (r < r0 || r > r1 + 0.4 || a < a0 || a > a1) continue;
      const k = Math.min(n - 1, Math.floor((a - a0) / (a1 - a0) * n)), fr = (a - a0) / (a1 - a0) * n - k, M = k < lit ? litMat : mat;
      sp(x, y, M, fr < 0.18 ? 4 : fr > 0.82 ? 2 : r > r1 - 0.8 ? 3 : 0);
    }
  }
  function sickle(x0, y0, cx, cy, x1, y1, mat) {                                           // 镰刀尾羽：二次贝塞尔，2 格宽的羽带、最后两成收成 1 格尖
    part();
    for (let i = 0; i <= 30; i++) {
      const t = i / 30, x = (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * cx + t * t * x1, y = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * cy + t * t * y1;
      const tx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx), ty = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
      U.dot(E, x, y, mat, t > 0.9 ? 4 : 0); if (t < 0.8) { if (Math.abs(tx) > Math.abs(ty)) U.dot(E, x, y + 1, mat, 0); else U.dot(E, x + 1, y, mat, 0); }
    }
  }
  // 候选部件：spurLeg 距腿——细胫（1 格）+ 三前趾一后趾 + 胫后一根前弯的钢爪距（4 格，伸出腿的轮廓）；kick 0 垂 · 1 前伸 · 2 前蹬。一个部件。
  function spurLeg(hx, hy, kick, step, far) {
    part();
    const L = 6, ax = hx + (kick === 2 ? 6 : kick === 1 ? 2 : -1 + step), ay = hy + (kick === 2 ? 2 : kick === 1 ? L - 1 : L);
    const dl = Math.hypot(ax - hx, ay - hy), dx = (ax - hx) / dl, dy = (ay - hy) / dl, bkx = -dy, bky = dx;   // 胫的方向、胫后方向
    const leg = m.leg, spur = m.spur;
    U.seg(E, hx, hy, ax, ay, 1, leg, far ? 2 : 0);
    for (let k = 1; k <= 2; k++) U.dot(E, ax + dx * 0 + k * (kick === 2 ? dx : 1), ay + (kick === 2 ? dy * k : 0), leg, k === 2 ? 4 : 3);   // 前趾
    U.dot(E, ax - (kick === 2 ? dx : 1), ay - (kick === 2 ? dy : 0) + (kick === 2 ? 0 : 0), leg, 2);                                   // 后趾
    const bx0 = ax - dx * 2, by0 = ay - dy * 2;                                                                                       // 爪距：往后伸 3 格，尖端往前弯上来
    U.dot(E, bx0 + bkx, by0 + bky, spur, 3); U.dot(E, bx0 + bkx * 2, by0 + bky * 2, spur, 3); U.dot(E, bx0 + bkx * 3 - dx, by0 + bky * 3 - dy, spur, 4); U.dot(E, bx0 + bkx * 3 - dx * 2, by0 + bky * 3 - dy * 2, spur, 4);
  }
  function breastplate(cx, cy) {                                                            // 铜钱护心镜：圆盘 7 格、方孔 2×2、一圈铆钉
    part(); cx = R(cx); cy = R(cy);
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const d = i * i + j * j; if (d > 11) continue; U.dot(E, cx + i, cy + j, m.coin, d >= 8 && ((i + j) & 1) === 0 ? 4 : 0); }
    for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) U.dot(E, cx + i - 1 + 1, cy + j - 1 + 1 - 1, m.ink, 0);
    if (P.glint) { U.dot(E, cx - 2, cy - 1, m.glow, 4); U.dot(E, cx - 1, cy - 2, m.glow, 4); }
  }
  function comb(hx, top, lean, tall, rot) {                                                 // 5 齿锯齿冠（齿高 3/4/5/4/3，齿间低 2 格）；rot = 1 倒在地上往前摊
    const H = [3, 1, 4, 2, 5, 2, 4, 1, 3];
    for (let i = 0; i < 9; i++) { const h = H[i] + (tall && (i & 1) === 0 ? 1 : 0); for (let k = 0; k < h; k++) { const sx = k >= h - 2 && (i & 1) === 0 ? lean : 0; if (rot) U.dot(E, hx + 1 + k, top + i - 5, m.comb, k === h - 1 ? 4 : 0); else U.dot(E, hx - 4 + i + sx, top - k, m.comb, k === h - 1 && (i & 1) === 0 ? 4 : 0); } }
  }
  function headNeck() {
    part(); const C = rig.C, nb = U.toW(C.x, C.y, C.a, rig.rx * 0.45, -rig.ry * 0.55);
    U.taper(E, nb[0], nb[1], hd.x - 0.5, hd.y + 1, 2.6, 2, m.limb, 0);                       // 颈（蓑羽）
    for (let k = 1; k <= 3; k++) { const x = lerp(nb[0], hd.x, k / 4) - 1, y = lerp(nb[1], hd.y, k / 4) + 1; U.dot(E, x, y, m.limb, 2); }
    U.oval(E, hd.x, hd.y, hd.r, hd.r * 0.95, m.limb, 0);
    const xe = R(hd.x + hd.r), by = R(hd.y), jaw = P.jaw | 0;                               // 喙：3 格、微钩
    sp(xe, by - 1, m.beak, 4); sp(xe + 1, by - 1, m.beak, 3); sp(xe + 2, by - 1, m.beak, 3); sp(xe + 3, by, m.beak, 2);
    if (jaw) { sp(xe + 1, by, m.ink, 0); sp(xe + 2, by, m.ink, 0); sp(xe, by + jaw, m.beak, 2); sp(xe + 1, by + jaw, m.beak, 2); if (jaw > 1) sp(xe + 2, by + 2, m.beak, 2); }
    else { sp(xe, by, m.beak, 2); sp(xe + 1, by, m.beak, 2); sp(xe + 2, by, m.beak, 2); }
    const [ex, ey] = eyeAt(); sp(ex - 1, ey - 1, m.limb, 4); sp(ex, ey, m.ink, 0); sp(ex + 1, ey, m.ink, 0);   // 空眼窝 + 钢白魂火
    const lv = P.eyes ? 0 : P.eyeLv;
    if (lv === 0) sp(ex, ey, m.eye, 1); else if (lv === 1) sp(ex, ey, m.eye, 3); else if (lv === 2) { sp(ex, ey, m.eye, 3); sp(ex + 1, ey, m.eye, 2); } else if (lv === 3) { sp(ex, ey, m.eye, 4); sp(ex + 1, ey, m.eye, 3); sp(ex, ey - 1, m.eye, 3); }
  }
  function combWattle() {
    part(); comb(R(hd.x), R(hd.y - hd.r * 0.95), P.comb === 2 ? 0 : P.comb, P.comb === 2, 0);
    const wx = R(hd.x + 2), wy = R(hd.y + 2), sw = P.wat | 0;                               // 肉垂：喙下垂 3 格，末端甩
    U.dot(E, wx, wy, m.comb, 0); U.dot(E, wx + 1, wy, m.comb, 0); U.dot(E, wx, wy + 1, m.comb, 0); U.dot(E, wx + 1, wy + 1, m.comb, 2); U.dot(E, wx + sw, wy + 2, m.comb, 3); U.dot(E, wx + 1 + sw, wy + 2, m.comb, 2);
  }
  function tails(C) {                                                                       // 三根镰刀尾羽：从尾根往后上方拱过头顶
    const t = U.toW(C.x, C.y, C.a, -rig.rx * 0.8, -rig.ry * 0.3), sw = (P.gf === 0 ? 1 : P.gf === 2 ? -1 : 0) + (P.bx > 3 ? -1 : 0);
    sickle(t[0], t[1] + 1, t[0] - 12, t[1] - 14, t[0] - 16 + sw, t[1] - 2, m.steelFar);
    sickle(t[0], t[1], t[0] - 8, t[1] - 23, t[0] - 15 + sw, t[1] - 9, m.steel);
    sickle(t[0] + 1, t[1] - 1, t[0] - 2, t[1] - 27, t[0] - 12 + sw, t[1] - 16, m.steel);
  }
  function legs(C) {
    const h = U.toW(C.x, C.y, C.a, -0.5, rig.ry * 0.85), k = P.lie === 1 ? 0 : (P.kick | 0);
    spurLeg(h[0] + 1.5, h[1] - 0.5, k, -P.lstep, 1); spurLeg(h[0] - 0.5, h[1], k, P.lstep, 0);
  }
  function drawStanding() {
    const C = rig.C, wp = P.gf >= 0 ? B.FLAP[P.gf] : P.wing, W = B.WINGS[wp], wr = rig.wing;
    if (!P.shield) armorWing(wr.x + 2.5, wr.y - 1.5, W, o.wing, m.steelFar);                  // 远翼
    else armorWing(wr.x + 1, wr.y, B.WINGS[4], o.wing, m.steelFar);
    tails(C);
    if (P.legs) legs(C);
    F.body(E, rig, P, o);
    const c = chestAt(); breastplate(c[0], c[1]);
    if (!P.shield) armorWing(wr.x, wr.y, P.wshake ? [W[0] + 0.25, W[1] + 0.2, W[2]] : W, o.wing, m.steel);   // 近翼
    headNeck(); combWattle();
    if (P.shield) {                                                                         // 羽甲盾：远翼一层在上、近翼一层压在前面
      const sx = c[0] - 1, sy = c[1] - 1, big = P.shield === 2;
      plateShield(sx + 1, sy - 1, big ? 5 : 4, big ? 9 : 7, -1.35, big ? 1.1 : 0.5, 5, m.steelFar, m.lit, P.lit);
      plateShield(sx, sy + 1, big ? 4 : 3, big ? 8 : 6, -1.0, big ? 1.35 : 0.8, 5, m.plate, m.lit, P.lit);
    }
  }
  function drawLying() {                                                                    // 侧翻：背贴地、肚皮和两条距腿朝天，冠摊在地上，镰尾顺着地面往后倒
    sickle(-5, -3, -11, -5, -19, -1, m.steelFar); sickle(-5, -4, -10, -10, -18, -5, m.steel); sickle(-4, -5, -8, -13, -15, -9, m.steel);
    armorWing(-2, -2, [0.15, -0.05, 0.6], { span: 9, chord: 3, fingers: 4 }, m.steelFar);   // 翅膀垂在身下
    for (const [x, sx, far] of [[2, 1, 1], [-2, -1, 0]]) {                                  // 两条腿朝天：胫、趾蜷起、爪距朝后上
      part(); U.seg(E, x, -7, x + sx, -13, 1, m.leg, far ? 2 : 0);
      U.dot(E, x + sx, -14, m.leg, 4); U.dot(E, x + sx + 1, -14, m.leg, 3); U.dot(E, x + sx + 2, -13, m.leg, 3); U.dot(E, x + sx - 1, -13, m.leg, 2);
      U.dot(E, x - 1, -10, m.spur, 3); U.dot(E, x - 2, -10, m.spur, 3); U.dot(E, x - 3, -11, m.spur, 4); U.dot(E, x - 3, -12, m.spur, 4);
    }
    part(); U.oval(E, 0, -4, 6.5, 4, m.body, 0); for (let x = -4; x <= 2; x += 3) U.dot(E, x, -6, m.body, 2);
    breastplate(6, -4);
    part(); U.taper(E, 5, -3, 9, -2.5, 2.2, 1.8, m.limb, 0); U.oval(E, 10, -2.6, 2.6, 2.4, m.limb, 0);
    sp(13, -3, m.beak, 3); sp(14, -3, m.beak, 2); sp(13, -2, m.beak, 2); sp(10, -3, m.ink, 0); sp(11, -3, m.ink, 0);
    const lv = P.eyeLv; if (lv < 4) sp(10, -3, m.eye, lv === 0 ? 1 : lv >= 2 ? 3 : 2);
    part(); comb(10, -5, 1, 0, 0); U.dot(E, 12, -1, m.comb, 0); U.dot(E, 13, -1, m.comb, 2);
  }
  function drawHero() { begin(hero, P.bx, -(P.lie === 2 ? P.lift : 0)); if (P.lie === 2) drawLying(); else drawStanding(); }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效：敌箭 / 反弹箭 / 钉地箭 / 钢羽甲片 ─────
  const K_IN = 1, K_STUCK = 2, K_BACK = 3, K_GROUND = 4, K_PLATE = 5, NO = 24;
  const OB = Array.from({ length: NO }, () => ({ k: 0, x: 0, y: 0, vx: 0, vy: 0, g: 0, age: 0, life: 0, fl: 0, tx: 0, ty: 0, bn: 0, rest: 0, i: 0 }));
  function obj(k, x, y, vx, vy, g, life, i) { for (const b of OB) if (!b.k) { b.k = k; b.x = x; b.y = y; b.vx = vx; b.vy = vy; b.g = g; b.age = 0; b.life = life; b.fl = 0; b.bn = 0; b.rest = 0; b.i = i || 0; return b; } return null; }
  function aim(b, tx, ty, T) { b.tx = tx; b.ty = ty; b.fl = T; b.age = 0; b.vx = (tx - b.x) / T; b.vy = (ty - b.y - 0.5 * b.g * T * T) / T; }
  let chargeAcc = 0, soulAcc = 0, lastGf = -1, smT = 9, smX = 0, smY = 0, hitT = 9, hitX = 0, hitY = 0, landN = 0;
  const shieldX = () => HX + P.mx + 13, ARROW_Y = [HY - 15, HY - 11, HY - 18];
  function onEnter(s) {
    if (s === CAST) { clearOrbit(); obj(K_IN, 134, ARROW_Y[0], -ARROW_V, 0, 0, 1, 0); landN = 0; }
    if (s === CHARGE) { const x = HX - HOP + 3, y = HY - 16; fx.dome(x, y + 4, 12, 14, R_EL, 1.35, 2); }   // 半圆光罩按角度逐点亮起
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                      // 双腿前蹬：两道向下的爪距弧
      const x = scrX(8 + P.bx), y = HY - 9;                                                  // 前蹬时爪距的高度（悬停抬高 2 格后）
      fx.slash(x - 3, y - 6, 7, 0.9, 2.4, R_EL, 0.17, 2, 2); fx.slash(x + 1, y - 5, 6, 1.0, 2.5, R_EL, 0.17, 1, 2);
      smT = 0; smX = DUMMY_X - 4; smY = HY - 11;
      hitDummy(0, 1); burst(DUMMY_X - 4, HY - 11, 10, 40, 100, 0.15, 0.35, FXI.impact, 10); burst(DUMMY_X - 4, HY - 11, 6, 40, 90, 0.15, 0.3, R_EL, 8);
      sfx('swing', { kind: 'claw', w: 0.5 }); sfx('hit', { mat: 'metal', w: 0.5 });
    }
    if (s === CAST && (t === T_A[1] || t === T_A[2])) obj(K_IN, 134, ARROW_Y[t === T_A[1] ? 1 : 2], -ARROW_V, 0, 0, 1, t === T_A[1] ? 1 : 2);
    if (s === CAST && t === T_OPEN) {                                                       // 双翼猛张：箭反弹回去
      for (const b of OB) if (b.k === K_STUCK) { b.k = K_BACK; b.g = 420; aim(b, DUMMY_X - 9 + b.i * 3, HY, 0.22 + b.i * 0.06); }
      const x = shieldX(), y = HY - 14; burst(x, y, 24, 50, 130, 0.25, 0.55, R_EL, 10); ring(x - 2, y, 1, R_EL); shake(0.28, 2); flash(0.05);
      for (let i = 0; i < 6; i++) spawn(K_DUST, HX + P.mx - 6 + Math.random() * 16, HY, (Math.random() - 0.5) * 40, -6 - Math.random() * 8, 0.35, FXI.dust);
    }
    if (s === DEATH && t === T_FALL) {                                                      // 撞地：扬尘、震屏、钢羽甲片弹开
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 14 + Math.random() * 28, HY - 1, (Math.random() - 0.5) * 34, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      for (let i = 0; i < 3; i++) obj(K_PLATE, HX - 2 + i * 3, HY - 6, -40 + i * 38, -70 - i * 12, 380, 1.1, i);
      shake(0.12, 1); sfx('fall', { w: 0.5 });
    }
    if (s === DEATH && t === T_ASH) {                                                       // 魂火熄灭后化灰
      poseAt(DEATH, T_ASH - 1 / 12, T_ASH - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('ash', { ramp: 'dust' });
    }
  }
  const EVENTS = [[], [], [T_HIT], [], [T_A[1], T_A[2], T_OPEN], [], [], [T_FALL, T_ASH], []];
  function hurtFx(s) {                                                                      // 钢羽甲：火花多、带几颗长寿命白火星
    const x = HX + HIT_POINT[0] - 1, y = HY + HIT_POINT[1];
    burst(x, y, s === DEATH ? 22 : 16, 60, 150, 0.2, 0.5, FXI.impact, 18); burst(x, y, 4, 40, 90, 0.5, 0.8, R_EL, 12);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepObj(dt) {
    for (const b of OB) {
      if (!b.k) continue; b.age += dt;
      if (b.k === K_IN) {                                                                   // 敌箭撞上羽甲盾：那一格变白，钢火花，「铛」
        b.x += b.vx * dt; const sx = shieldX() + (b.i === 1 ? 1 : 0);
        if (b.x <= sx) { b.x = sx; b.k = K_STUCK; hitT = 0; hitX = sx - 1; hitY = b.y; burst(sx - 1, b.y, 8, 40, 110, 0.15, 0.4, R_EL, 8); fx.cross(sx - 1, b.y, 3, R_EL, 0.15, 2); shake(0.08, 1); sfx('impact', { pal: 'metal', w: 0.35 }); }
      } else if (b.k === K_BACK) {
        b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.age >= b.fl) {                                                                // 钉进假人脚前的地面
          b.k = K_GROUND; b.x = b.tx; b.y = HY; b.age = 0; b.life = 0.9;
          for (let i = 0; i < 3; i++) spawn(K_DUST, b.x, HY, (Math.random() - 0.5) * 20, -5 - Math.random() * 6, 0.3, FXI.dust);
          burst(b.x, HY - 2, 6, 30, 70, 0.15, 0.3, R_EL, 10);
          if (landN++ === 0) { hitDummy(1, 1); ring(DUMMY_X, HY - 14, 1, R_EL); shake(0.12, 1); sfx('impact', { pal: 'metal', w: 0.5 }); dummyFx({ dur: 0.5, outline: R_EL }); }
        }
      } else if (b.k === K_GROUND) { if (b.age >= b.life) b.k = 0; }
      else if (b.k === K_PLATE) {
        if (!b.rest) { b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.y >= HY) { b.y = HY; if (b.bn < 1) { b.vy = -Math.abs(b.vy) * 0.35; b.vx *= 0.5; b.bn++; } else { b.rest = 1; b.age = 0; } } }
        else if (b.age >= 1.2) b.k = 0;
      } else if (b.k === K_STUCK && E.state !== CAST) b.k = 0;
    }
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > 0.5) {                                                    // 钢光点汇到胸前
      chargeAcc += dt * (12 + 22 * clamp01(stT / DUR[CHARGE]));
      const tx = scrX(P.gx), ty = HY + P.gy;
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.PI * (0.9 + Math.random() * 1.2), r = 10 + Math.random() * 8; spawnX(K_SPIRAL_PT, tx, ty, r / (0.3 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 3 + Math.random() * 2, tx, ty }); }
    }
    if (state === MOVE && P.gf !== lastGf) {                                                // 下沉那一拍爪距掠过地面
      if (P.gf === 0) { sfx('step', { w: 0.35 }); for (let i = 0; i < 2; i++) spawn(K_DUST, scrX(0) + (Math.random() - 0.5) * 4, HY, (P.flip ? 1 : -1) * (8 + Math.random() * 10), -4 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust); }
      lastGf = P.gf;
    }
    if (state === DEATH && stT > INCOMING + 1.7 && stT < INCOMING + 2.5) { soulAcc += dt * 18; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 22, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.7, FXI.soul); } }
    stepObj(dt); smT += dt; hitT += dt;
  }
  function fxReset() { for (const b of OB) b.k = 0; chargeAcc = 0; soulAcc = 0; lastGf = -1; smT = 9; hitT = 9; landN = 0; }
  function fxBack(f12) {
    if (P.dq < 0.6 && P.lie !== 2) groundShadow(scrX(P.bx), 6, -rig.C.y - rig.ry);
    floorGlow(scrX(P.gx), P.rim, EL, f12);
  }
  function arrow(x, y, d, c0, c1, c2) { put(x, y, c0); for (let k = 1; k <= 4; k++) put(x - d * k, y, k < 3 ? c1 : c2); put(x - d * 4, y - 1, c2); put(x - d * 5, y + 1, c2); put(x - d * 5, y - 1, c2); }
  function fxFront(f12) {
    for (const b of OB) {
      if (!b.k) continue; const x = R(b.x), y = R(b.y);
      if (b.k === K_IN || b.k === K_STUCK) arrow(x, y, -1, 21, EN[1], EN[2]);             // 敌箭（朝左飞）
      else if (b.k === K_BACK) { const d = b.vy > 60 ? 1 : 0; put(x, y, 21); put(x - 1, y - d, EL[1]); put(x - 2, y - d, EL[2]); put(x - 3, y - 2 * d, EN[2]); put(x - 4, y - 2 * d, EN[2]); }
      else if (b.k === K_GROUND) { if (b.age > b.life * 0.7 && (f12 & 1)) continue; put(x, y, EL[3]); put(x - 1, y - 1, EL[2]); put(x - 2, y - 2, EN[2]); put(x - 3, y - 3, EN[2]); put(x - 3, y - 2, EN[3]); put(x - 2, y - 3, EN[3]); }
      else if (b.k === K_PLATE) { if (b.rest && b.age > 0.8 && (f12 & 1)) continue; const c = b.rest ? 29 : ((f12 + b.i) & 1 ? 30 : 29); put(x, y, c); put(x + 1, y, 29); put(x, y - 1, 30); put(x + 1, y - 1, 28); }
    }
    if (hitT < 2 / 12) { const c = hitT < 1 / 12 ? 21 : EL[1]; put(hitX, hitY, 21); put(hitX - 1, hitY, c); put(hitX, hitY - 1, c); put(hitX, hitY + 1, c); }
    if (smT < 2 / 12) { const c = smT < 1 / 12 ? EL[0] : EL[2]; for (let k = -2; k <= 2; k++) { if (smT >= 1 / 12 && (k & 1)) continue; put(smX + 1, smY + k, c); } }
  }

  return {
    name: '公鸡', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.eye], HIT_POINT, EVENTS,
    deathKit: { mode: 'ash', at: T_ASH },
    SFX: { body: 'armor', how: 'collapse', pal: 'metal', style: 'shield', w: 0.5 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, hurtFx, stepFX, fxReset, fxBack, fxFront,
  };
});
