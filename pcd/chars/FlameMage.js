// 火焰法师（部队 · 科技 · 法师 · 稀有 · 远程 680）：见习法师走「重装喷火」路线的样子——矮壮档（约 26 格高、20 格宽含罐，头身比 4），
// 背上的法力罐变成两只并排的红铁油罐（罐顶各一只压力表 + 弯管，高出肩 4 格），被压得身体微前倾；学徒的护目镜焊进一张方形焊工面罩，
// 两只圆镜片透出橙光、面罩顶沿翻起，帽后垂一片防火皮披颈；双手腰持一支喷火枪（黄铜枪身 + 铁护罩喷嘴，嘴口一簇常燃蓝色引火），粗软管从油罐绕腰接到枪尾。
// 攻击 = 双手压枪，喷嘴吐出一段短火舌 + 一团飞出的火球；技能 = 特性「火焰占卜」（每次攻击溅射周围）：两只压力表同时拉满、罐身抖动、引火蓝→白→橙，
// 地面映出红光 → 喷出一道三层扇形火锥横跨到目标 → 目标处火团炸开，火星环形溅落，左右各 3 处点起小火苗（溅射范围读法）。
// 死亡 = 前扑：油罐被打穿漏火 → 向前扑倒、喷火枪甩出去，背上油罐「噗」地起一团小火烧完熄灭，焦烟上升后消散。升级自见习法师（MageApprentice.js）。
PCD.define('FlameMage', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, PX = parts.px;

  // ───── 元素：火焰 · 喷焰橙（fire 色阶），引火蓝芯借 frost 第 2 级 ─────
  const R_EL = FXI.fire, EL = FXR[R_EL], FR = FXR[FXI.frost], DU = FXR[FXI.dust];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    suit: { r: [0, 20, 19, 32], band: 2 }, apron: [0, 27, 28, 29], tank: { r: 'crimson' }, band: 'iron', mask: 'iron', brass: 'gold', skin: 'skin',
    boot: 'boot', flap: 'leather', hose: [0, 27, 27, 28], dial: 'white', ink: { r: 'ink', flat: 1 },
    lens: { r: [44, 45, 46, 47], flat: 1 },                          // 面罩镜片透出的橙光
    pilotB: { r: [39, 40, 22, 21], flat: 1 }, pilotO: { r: [44, 45, 46, 47], flat: 1 }, pilotW: { r: [46, 47, 51, 21], flat: 1 },   // 引火：蓝 / 橙 / 白（发光体）
  });
  const BODY = { body: 'stocky', leg: 7, torso: 10, head: 6, headW: 6, sw: 5, arm: 8, stride: 3, fall: 'front' };
  const R0 = parts.rig({}, BODY);
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(100, 46, 42, 42);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 15], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['skin', 'hose', 'ink', 'lens', 'pilotB', 'pilotO', 'pilotW', 'dial', 'band']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手握枪身前段（hx, hy），枪沿 a 方向（0 = 水平朝右）；后手自动握在枪尾 ─────
  // pg 压力表 0–2 · pl 引火 0 蓝 / 1 白 / 2 橙 / 3 灭 · tb 油罐颠起 · tsh 罐身抖动 · lens 镜片亮
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, st: 0, pg: 0, pl: 0, tb: 0, tsh: 0, lens: 1, up: 0, vt: 0, puff: 0, bp: 0,
    gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, lean, head, crouch) => ({ hx, hy, a, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const A1 = Math.atan(0.25);
  const K_IDLE = K(7, -10, -A1, 1);                                // 腰持：枪口略朝下，被油罐压得前倾
  const K_PRESS = K(6, -10, 0, 0, 0, 1);                           // 预兆：压枪下蹲
  const K_SPIT = K(7, -10, 0, 1, 0, 1);
  const K_HOLD = K(7, -10, 0, 1);
  const K_CHARGE = K(6, -11, 0, 0, -1, 1);                         // 蓄力：扎稳马步
  const K_CAST = K(6, -10, 0, 0, 0, 2);
  const K_HURT = K(5, -9, -A1 * 2, -1, -1);
  const K_STUMBLE = K(8, -8, -A1 * 2, 2, 1, 2);
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -16, 20], ['hy', -30, 5], ['a', -32, 32, 1 / ASTEP], ['bhx', -20, 16], ['bhy', -30, 5], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['pg', 0, 2], ['pl', 0, 3], ['tb', 0, 1], ['tsh', -1, 1], ['lens', 0, 2]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['vt', 0, 1], ['puff', 0, 1]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], T_SPIT = 2 / 12, T_HIT = 2 / 12, T_LAND = INCOMING + 0.66;
  // 待机个性（第 20–24 帧 = 1.67–2.0 s，5 帧各不相同）：[后手沿枪位置 bp（0 = 枪尾常态）, 后手高出枪背 up, 阀门拧开 vt, 引火 pl, 「呼」大火 puff, 镜片 lens 0 暗 / 1 / 2 亮, 枪后坐]
  //   ① 后手越过前手、抬到喷嘴后的阀门上（高出枪背 2 格）② 拧阀（手落 1 格）、引火跳橙 ③「呼」火苗长到 3 格、镜片最亮、枪后坐 1 格 ④ 火缩回、镜片变暗 ⑤ 拧回、手往回收、引火回蓝
  const VALVE = 4;
  const PERS = [[VALVE, 2, 0, 0, 0, 1, 0], [VALVE, 1, 1, 2, 0, 1, 0], [VALVE, 1, 1, 2, 1, 2, 1], [VALVE, 1, 1, 2, 0, 0, 0], [2, 1, 0, 0, 0, 1, 0]], PERS_F0 = 20;
  const persIdx = (tq) => { const i = Math.round((tq % DUR[IDLE]) * 12) - PERS_F0; return i >= 0 && i < PERS.length ? i : -1; };
  const SNAP = [0, A1, Math.atan(0.5), Math.PI / 4];
  const snapA = (a) => { const s = Math.sign(a), v = Math.abs(a); let b = 0; for (const c of SNAP) if (Math.abs(v - c) < Math.abs(v - b)) b = c; return s * b; };
  const dir = (a) => [Math.cos(a), -Math.sin(a)];
  const BUTT = 7, NOZ = 8, BACKH = 5;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.pg = 0; P.pl = 0; P.tb = 0; P.tsh = 0; P.lens = 1; P.up = 0; P.vt = 0; P.puff = 0; P.bp = 0;
    let backOff = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const i = persIdx(tq); if (i >= 0) { const c = PERS[i]; P.bp = c[0]; P.up = c[1]; P.vt = c[2]; P.pl = c[3]; P.puff = c[4]; P.lens = c[5]; P.hx -= c[6]; P.glint = c[3] === 2 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                              // 重步蹒跚：左右晃、油罐咣当颠
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f);
      P.lean = [2, 1, 0, 1][f]; P.tb = P.step !== 0 ? 0 : 1; P.hx += [0, 0, -1, 0][f];
      const w = walkDemo(tq, 12, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_PRESS, ease.out(tq / 0.12)); P.gem = 1; P.pl = 1; }
      else if (tq < 0.25) { setK(K_SPIT, K_SPIT, 0); P.bx = -1; P.gem = 2; P.rim = 2; P.pl = 2; P.beard = -2; P.tb = 1; }
      else if (tq < 0.45) { setK(K_SPIT, K_HOLD, ease.out((tq - 0.25) / 0.2)); P.gem = 1; P.pl = 2; P.beard = -1; }
      else setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {                                          // 两只压力表同时拉满、罐身抖动、引火蓝→白→橙
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      P.pg = tq < 0.4 ? 0 : tq < 0.8 ? 1 : 2; P.tsh = tq >= DUR[CHARGE] - 0.3 ? ((f12 & 1) ? 1 : -1) : tq > 0.6 ? ((f12 >> 1) & 1) : 0;   // 最后 0.3 s 两只罐左右对撞抖 P.pl = tq < 0.5 ? 0 : tq < 0.95 ? 1 : 2;
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.lens = tq > 0.5 && (f12 & 1) ? 0 : 1;
    } else if (st === CAST) { setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.bx = tq < 0.3 ? -1 : 0; P.pg = 2; P.pl = 2; P.gem = 3; P.rim = 3; P.beard = -2; P.tb = tq < 2 / 12 ? 1 : 0; }
    else if (st === RECOVER) {                                           // 喷嘴回到蓝色引火，油罐冒一缕黑烟
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.beard = -RD(1 - q);
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.pg = q < 0.4 ? 1 : 0; P.pl = q < 0.3 ? 2 : q < 0.5 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.tb = 1; P.lens = 0; P.pg = 1; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.beard = 1; P.rim = 0; P.tsh = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                           // 前扑：油罐被打穿漏火 → 踉跄前扑 → 喷火枪甩出去，背上起火烧完熄灭
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.tsh = (f12 & 1) ? 1 : -1; P.pg = 2; P.pl = (f12 & 1) ? 2 : 0; P.lens = 0; }
      else if (d < 0.5) { setK(K_STUMBLE, K_STUMBLE, 0); P.bx = 0; P.eyes = 1; P.beard = -2; P.pl = 3; P.lens = 0; P.pg = 2; }
      else {
        P.lying = 1; P.bx = 0; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.lean = 0; P.head = 0; P.crouch = 0; P.a = 0; P.pl = 3; P.lens = 0; P.pg = 0;
        P.hx = R0.sFx + 2; P.hy = R0.yWaist + 2; backOff = 9;
        const hq = clamp01((d - 0.5) / 0.4); P.hatX = RD(12 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 5);
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.a = snapA(P.a); P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (backOff === 9) { P.bhx = R0.sBx - 1; P.bhy = R0.yWaist + 3; }
    else if (P.bp) { const u = dir(P.a); P.bhx = RD(P.hx + u[0] * P.bp); P.bhy = RD(P.hy + u[1] * P.bp) - 1 - P.up; }   // 后手握在喷嘴后的阀门上
    else { const u = dir(P.a); P.bhx = RD(P.hx - u[0] * BACKH); P.bhy = RD(P.hy - u[1] * BACKH); }
    if (P.lying) { P.gx = 24 + P.hatX; P.gy = -1 - P.hatY; }
    else { const u = dir(P.a); P.gx = RD(P.hx + u[0] * (NOZ + 2)) + P.bx; P.gy = RD(P.hy + u[1] * (NOZ + 2)); }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：twinTanks —— 背负的并排双油罐（远侧那只高 2 格、后错 4 格、暗一级，中间 1 列铁缝）：圆顶 + 两道铁箍 + 罐顶压力表（指针 pg）+ 一根弯管；
  //   罐身抖动 tsh、颠起 tb。返回 { x0, x1, top, bot }（近侧罐）
  function tankBox(R) { const e = parts.edges(R, R.yS + 2), x1 = e[0] - 1 + P.tsh, x0 = x1 - 5; return { x0, x1, top: R.yS - 4 - P.tb, bot: R.yWaist + 2 - P.tb }; }
  function oneTank(R, x0, top, bot, far) {
    const m = far ? M.tankD : M.tank, bm = far ? M.bandD : M.band;
    E.part();
    parts.run(E, R, top, x0 + 1, x0 + 4, m, 0);
    for (let y = top + 1; y <= bot; y++) parts.run(E, R, y, x0, x0 + 5, m, 0);
    if (!far) for (let y = top + 1; y <= bot; y++) PX(E, R, x0 - 1, y, M.band, y & 1 ? 1 : 2);   // 两罐之间 1 格铁缝
    for (const y of [top + 3, bot - 2]) parts.run(E, R, y, x0, x0 + 5, bm, 0);
    if (!far) { PX(E, R, x0 + 1, top + 1, m, 4); PX(E, R, x0 + 1, top + 2, m, 4); PX(E, R, x0 + 1, top + 5, m, 4); }
    const gx = x0 + 3, gy = top - 2;                                     // 压力表 + 弯管
    parts.rect(E, R, gx - 1, gy - 1, 3, 2, M.brass, 0); PX(E, R, gx, gy, M.dial, 4); PX(E, R, gx - 1, gy - 1, M.brass, 4);
    if (P.pg === 2) { PX(E, R, gx + 1, gy, M.lens, 4); PX(E, R, gx + 1, gy - 1, M.lens, 3); }   // 拉满：指针烧亮（火色第 2 级）
    else PX(E, R, gx + [-1, 0][P.pg], gy - 1 + (P.pg === 1 ? 0 : 1), M.ink, 1);
    PX(E, R, gx, gy + 1, M.brass, 2);
    PX(E, R, x0, top - 1, M.brass, 3); PX(E, R, x0 - 1, top - 2, M.brass, 3); PX(E, R, x0 - 1, top - 3, M.brass, 4);   // 弯管
  }
  function twinTanks(R) { const B = tankBox(R); oneTank(R, B.x0 - 4 - 2 * P.tsh, B.top - 2, B.bot - 1, 1); oneTank(R, B.x0, B.top, B.bot, 0); return B; }   // 远罐后错 4 格、高 2 格；抖动时与近罐反向
  // 候选部件：flameGun —— 喷火枪：2 行黄铜枪身（杖尾到护罩）+ 铁护罩喷嘴（3×3，嘴口一格墨）+ 嘴前引火（发光体，pl 换色，单独一个部件）
  function flameGun(T, gx, gy, a) {
    const u = dir(a), nx = -u[1], ny = u[0];
    E.part();
    parts.line(E, T, gx - u[0] * BUTT, gy - u[1] * BUTT, gx + u[0] * (NOZ - 2), gy + u[1] * (NOZ - 2), M.brass, 3);
    parts.line(E, T, gx - u[0] * BUTT + nx, gy - u[1] * BUTT + ny, gx + u[0] * (NOZ - 3) + nx, gy + u[1] * (NOZ - 3) + ny, M.brass, 2);
    PX(E, T, gx - u[0] * 2 + nx * 2, gy - u[1] * 2 + ny * 2, M.brass, 2); PX(E, T, gx - u[0] * 2 + nx * 3, gy - u[1] * 2 + ny * 3, M.brass, 2);   // 扳机握把
    { const vx = gx + u[0] * VALVE - nx, vy = gy + u[1] * VALVE - ny;                                                                  // 阀门（喷嘴后）：立杆 + 手轮（vt 拧开时竖起）
      PX(E, T, vx, vy, M.brass, 3);
      if (P.vt) { PX(E, T, vx - nx, vy - ny, M.brass, 4); PX(E, T, vx - 2 * nx, vy - 2 * ny, M.brass, 4); }
      else for (let k = -1; k <= 1; k++) PX(E, T, vx - nx + u[0] * k, vy - ny + u[1] * k, M.brass, k < 0 ? 4 : 3); }
    for (let d = NOZ - 1; d <= NOZ + 1; d++) for (let k = -1; k <= 1; k++) PX(E, T, gx + u[0] * d + nx * k, gy + u[1] * d + ny * k, M.band, k < 0 ? 4 : k > 0 ? 2 : 3);
    PX(E, T, gx + u[0] * (NOZ + 1), gy + u[1] * (NOZ + 1), M.ink, 1);
    if (P.pl === 3) return;
    E.part();
    const pm = P.pl === 0 ? M.pilotB : P.pl === 1 ? M.pilotW : M.pilotO, cx = gx + u[0] * (NOZ + 2), cy = gy + u[1] * (NOZ + 2);
    PX(E, T, cx, cy, pm, 4); PX(E, T, cx, cy - 1, pm, 3); PX(E, T, cx + 1, cy, pm, P.gem >= 2 ? 4 : 2);
    if (P.pl === 2 || P.gem >= 2) { PX(E, T, cx + 1, cy - 1, pm, 3); PX(E, T, cx, cy - 2, pm, 2); }
    if (P.puff) for (const [d, k, l] of [[1, 0, 4], [2, 0, 4], [2, -1, 3], [3, 0, 3], [3, -1, 3], [3, 1, 2], [4, -1, 2], [4, 0, 2], [2, 1, 3], [1, -2, 2]])   // 「呼」：火苗长到 3 格
      PX(E, T, cx + u[0] * d + nx * k, cy + u[1] * d + ny * k, pm, l);
  }
  // 候选部件：weldMask —— 方形焊工面罩（盖住脸前半、顶沿往前上翻起 1 格）+ 两只圆镜片（近侧凸出面罩 1 格，远侧露半只）透出橙光；lens 0 暗
  function weldMask(R) {
    const x0 = R.hx0, x1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey;
    E.part();
    for (let y = top; y <= bot; y++) parts.run(E, R, y, x0 + 2, x1 + 1, M.mask, 0);
    parts.run(E, R, top - 1, x0 + 1, x1 + 1, M.mask, 0); PX(E, R, x1 + 2, top - 2, M.mask, 3); PX(E, R, x1 + 1, top - 2, M.mask, 4);   // 翻起的顶沿
    PX(E, R, x0 + 3, top - 1, M.mask, 4); PX(E, R, x1 + 1, bot, M.mask, 2); parts.run(E, R, bot - 1, x1 - 1, x1 + 1, M.mask, 2);     // 下巴护板
    for (let y = ey + 2; y < bot - 1; y++) PX(E, R, x1 + 1, y, M.mask, ((y - ey) & 1) ? 2 : 3);                                         // 呼吸格栅
    const lt = P.lens === 0 ? 1 : P.lens === 2 || P.gem >= 2 ? 4 : 3;           // 镜片缩进面罩前沿 1 格，前沿留 1 列铁
    PX(E, R, x1 - 3, ey, M.lens, lt); PX(E, R, x1 - 3, ey - 1, M.lens, lt === 1 ? 1 : 2);
    parts.run(E, R, ey - 1, x1 - 1, x1, M.brass, 0); PX(E, R, x1 - 1, ey, M.lens, lt); PX(E, R, x1, ey, M.lens, lt === 1 ? 1 : lt - 1);
    parts.run(E, R, ey + 1, x1 - 1, x1, M.brass, 2);
    for (let y = top; y <= ey + 1; y++) PX(E, R, x1 + 1, y, M.mask, 2);
  }
  // 候选部件：neckFlap —— 帽后垂下的防火皮披颈（画在头之前，尖端随 beard 摆）
  function neckFlap(R) {
    E.part(); const x0 = R.hx0, top = R.htop, b = RD(P.beard || 0);
    for (let y = top; y <= R.hy + 3; y++) { const k = y - top, s = y > R.hy ? RD(-b * 0.5) : 0; parts.run(E, R, y, x0 - 1 + s - (k > 3 ? 1 : 0), x0 + 1 + s, M.flap, 0); if (k & 1) PX(E, R, x0 + s, y, M.flap, 2); }
  }
  // 候选部件：beltHose —— 粗软管（2 格）：从油罐底部绕过后腰、在肚子下方兜一圈接到枪尾
  function beltHose(R, B, x2, y2) {
    E.part(); const x0 = B.x0 + 2, y0 = B.bot + 1, x1 = 1, y1 = R.yHip + 3; let lx = 1e9, ly = 1e9;
    for (let s = 0; s <= 24; s++) { const q = s / 24, a = (1 - q) * (1 - q), b = 2 * q * (1 - q), c = q * q, X = RD(a * x0 + b * x1 + c * x2), Y = RD(a * y0 + b * y1 + c * y2); if (X === lx && Y === ly) continue; lx = X; ly = Y; PX(E, R, X, Y, M.hose, 3); PX(E, R, X, Y + 1, M.hose, 2); }
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY), F = parts.FREE;
    const B = twinTanks(R);
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.suitD, cuff: M.flapD, hand: M.flapD, grip: R.lie ? 'fist' : 'none' });
    parts.legs(E, R, P, { style: 'boot', mat: M.suit, matD: M.suitD, boot: M.boot, bootD: M.bootD, bootH: 3 });
    parts.torso(E, R, P, { style: 'leather', mat: M.suit, belt: M.flap, buckle: M.brass, studs: M.brass });
    parts.apron(E, R, P, { mat: M.apron, strap: M.flap, stain: M.suit });
    const u = dir(P.a);
    if (!R.lie) beltHose(R, B, P.hx - u[0] * BUTT, P.hy - u[1] * BUTT);
    neckFlap(R);
    parts.head(E, R, P, { mat: M.skin, face: 'square', eye: M.ink, nose: 'none', mouth: 'none', ear: 'dot', stubble: M.suit });
    weldMask(R);
    if (R.lie) flameGun(F, 20 + P.hatX, -1 - P.hatY, 0);
    else { flameGun(R, P.hx, P.hy, P.a); parts.hand(E, R, P, { side: 'B', hand: M.flap, grip: P.bp ? 'fist' : 'big' }); }
    parts.arm(E, R, P, { sleeve: 'loose', mat: M.suit, cuff: M.flap, cuffStyle: 'bracer', hand: M.flap, grip: 'big' });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let mzT = 9, mzX = 0, mzY = 0, coneT = 9, cX = 0, cY = 0, splT = 9, smokeAcc = 0, soulAcc = 0, fireAcc = 0, lastStep = 0, lastPers = -1;
  const wx = (x) => scrX(x), wy = (y) => HY + y, TY = HY - 13;
  const SPL = [-15, -10, -5, 5, 10, 15];                               // 溅射落点（左右各 3 处）
  function tankTopW() {
    const R = parts.rig(P, BODY), B = tankBox(R), s = parts.toSprite(R, B.x0 + 2, R.lie ? B.top + 3 : B.top + 1);
    return [wx(s[0] + P.bx), wy(s[1] - P.lift)];
  }
  function onEnter(s) {
    if (s !== CAST) return;
    const gx = wx(P.gx), gy = wy(P.gy);
    releaseOrbit(40, 90, 0.25, 0.5, { ramp: 'fire' });
    coneT = 0; cX = gx; cY = gy; burst(gx, gy, 14, 40, 90, 0.15, 0.35, R_EL, 6);
    shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'fire' });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SPIT) {
      mzT = 0; mzX = wx(P.gx); mzY = wy(P.gy);
      shoot(1, mzX + 3, mzY, 150, DUMMY_X - 3, R_EL, -30, { trail: { every: 1, life: [0.12, 0.3], back: [10, 26] } });
      sfx('swing', { kind: 'gun', w: 0.5 }); sfx('shoot', { proj: 'fire' });
    }
    if (s === CAST && t === T_HIT) {                                     // 火团炸开 + 火星环形溅落 → 左右各 3 处小火苗
      const x = DUMMY_X, y = TY;
      burst(x, y, 30, 50, 130, 0.25, 0.6, R_EL, 14); ring(x, y, 1, R_EL); fx.cross(x, y, 6, R_EL, 0.2);
      for (const dx of SPL) spawnX(K_PHYS, x, y - 2, dx * 4.2, -60 - Math.abs(dx) * 1.5, 0.9, R_EL, { g: 300, floor: HY - 1 });
      splT = 0; hitDummy(1); dummyFx({ dur: 1.0, tint: 'fire' }); shake(0.12, 1); sfx('impact', { pal: 'fire', w: 0.7 });
    }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 6 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      const T = tankTopW(); burst(T[0], T[1], 14, 20, 60, 0.3, 0.6, R_EL, 20);   // 背上油罐「噗」地起火
      shake(0.12, 1); sfx('fall', { w: 0.65 });
    }
  }
  const EVENTS = [[], [], [T_SPIT], [], [T_HIT], [], [], [T_LAND], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 12, 30, 90, 0.15, 0.4, R_EL, 12); hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.4 }); }
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE && stT > 0.3) {                                 // 热浪：火星从地面汇聚到喷嘴
      fireAcc += dt * (8 + 18 * clamp01(stT / DUR[CHARGE]));
      while (fireAcc >= 1) { fireAcc -= 1; const r = 10 + Math.random() * 8, a = Math.random() * 6.2832; spawnX(K_SPIRAL_PT, gx, gy, (r - 2) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 5, tx: gx, ty: gy, squash: 0.5 }); }
    }
    if (state === MOVE && P.step !== lastStep) {                         // 重步：3 颗尘土 + 脚印 1 格火色余烬
      if (P.step !== 0) {
        sfx('step', { w: 0.65 }); const fx0 = wx(P.step > 0 ? 5 : -4);
        for (let i = 0; i < 3; i++) spawn(K_DUST, fx0 + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 20, -5 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust);
        spawnX(K_PHYS, fx0, HY - 1, 0, 0, 0.3, R_EL, { floor: HY - 1, age0: 0.2 });
      }
      lastStep = P.step;
    }
    if (state === IDLE) {                                                // 试喷：「呼」地冒一小口火
      const f = persIdx(q12(stT));
      if (f !== lastPers) { if (f === 2) for (let i = 0; i < 5; i++) spawn(K_EMBER, gx + 1 + Math.random() * 2, gy - 1, 6 + Math.random() * 8, -10 - Math.random() * 10, 0.3 + Math.random() * 0.2, R_EL); lastPers = f; }
    }
    if (state === RECOVER && stT > 0.1 && stT < 0.6) { smokeAcc += dt * 12; while (smokeAcc >= 1) { smokeAcc -= 1; const T = tankTopW(); spawnX(K_RISE, T[0] + (Math.random() - 0.5) * 3, T[1] - 2, (Math.random() - 0.5) * 4, -10 - Math.random() * 8, 0.7, FXI.dust, { age0: 0.45 }); } }   // 一缕黑烟
    if (state === DEATH && stT > INCOMING && stT < INCOMING + 0.5) { fireAcc += dt * 20; while (fireAcc >= 1) { fireAcc -= 1; const T = tankTopW(); spawn(K_EMBER, T[0] + (Math.random() - 0.5) * 4, T[1] + 4, -8 - Math.random() * 10, -8 - Math.random() * 10, 0.3 + Math.random() * 0.2, R_EL); } }   // 被打穿漏火
    if (state === DEATH && stT > T_LAND && stT < INCOMING + 1.45) { fireAcc += dt * (stT < INCOMING + 1.1 ? 30 : 10); while (fireAcc >= 1) { fireAcc -= 1; const T = tankTopW(); spawn(K_EMBER, T[0] + (Math.random() - 0.5) * 8, T[1] - 1, (Math.random() - 0.5) * 8, -14 - Math.random() * 12, 0.3 + Math.random() * 0.3, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.2 && stT < INCOMING + 2.3) { smokeAcc += dt * 14; while (smokeAcc >= 1) { smokeAcc -= 1; const T = tankTopW(); spawnX(K_RISE, T[0] + (Math.random() - 0.5) * 8, T[1] - 2, (Math.random() - 0.5) * 5, -10 - Math.random() * 10, 0.9, FXI.dust, { age0: 0.45 }); } }   // 焦烟
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 20; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 4 + Math.random() * 26, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    mzT += dt; coneT += dt; splT += dt;
  }
  function fxReset() { mzT = 9; coneT = 9; splT = 9; smokeAcc = 0; soulAcc = 0; fireAcc = 0; lastStep = 0; lastPers = -1; }
  function fxBack(f12) {
    if (!P.lying && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12);
    if (E.state === CHARGE && E.stT > 0.5) { const x0 = wx(0), w = RD(6 + 10 * clamp01((E.stT - 0.5) / 0.8)); for (let x = x0 - w; x <= x0 + w + 8; x++) if (((x + f12) & 1) === 0) put(x, HY, Math.abs(x - x0 - 4) < w * 0.5 ? EL[3] : EL[4]); }   // 地面红光
    shotFloorGlow(f12);
  }
  const H = (a, b) => E.hash(a, b);
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && !P.lying && P.dq < 1 && coneT > 0.4) { const L = P.gem === 3 ? 4 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : EL[1]; put(gx + r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); } }
    if (mzT < 2 / 12) {                                                  // 短火舌：3 格长扇形，2 帧
      const late = mzT >= 1 / 12;
      for (let d = 1; d <= 4; d++) { const h = d >> 1; for (let k = -h; k <= h; k++) { if (late && ((d + k) & 1)) continue; const c = Math.abs(k) === h && d > 1 ? EL[3] : d <= 2 ? EL[0] : EL[1]; put(mzX + d, mzY + k - (d > 2 ? 1 : 0), late ? EL[2] : c); } }
    }
    if (coneT < 0.4) {                                                   // 三层扇形火锥：外深红、中橙、芯白；后半段从喷嘴端断开
      const x1 = DUMMY_X + 2, span = x1 - cX, cut = coneT < 2 / 12 ? 0 : (coneT - 2 / 12) / 0.23;
      for (let x = cX + 1; x <= x1; x++) {
        const q = (x - cX) / span; if (q < cut) continue;
        const yc = cY + (TY - cY) * q, h = 1 + q * 6.5, fl = (H(x, f12) - 0.5) * 2;
        for (let k = -Math.ceil(h + 1); k <= Math.ceil(h + 1); k++) {
          const r = Math.abs(k + fl * 0.6) / (h + 0.5); if (r > 1.05) continue;
          if (coneT > 0.25 && ((x + k + f12) & 1)) continue;
          const c = r < 0.3 ? (coneT < 1 / 12 ? EL[0] : EL[1]) : r < 0.65 ? EL[2] : r < 0.9 ? EL[3] : EL[4];
          put(x, RD(yc + k), c);
        }
      }
    }
    if (splT < 1.5 && splT > 0.25) {                                     // 溅射火苗：左右各 3 处，持续约 0.6 s（先燃后灭）
      const q = clamp01((splT - 0.35) / 0.8);
      for (let i = 0; i < SPL.length; i++) {
        if (splT < 0.3 + Math.abs(SPL[i]) * 0.006) continue; const x = DUMMY_X + SPL[i], hgt = q < 0.7 ? 3 - (((f12 + i) & 1)) : q < 1 ? 1 : 0; if (!hgt) continue;
        put(x, HY - 1, EL[3]); put(x + 1, HY - 1, EL[4]); put(x - 1, HY - 1, EL[4]);
        for (let h = 1; h <= hgt; h++) put(x + (h === hgt && ((f12 + i) & 2) ? 1 : 0), HY - 1 - h, h === 1 ? EL[2] : h === 2 ? EL[1] : EL[0]);
      }
    }
    if (P.lying && E.state === DEATH && E.stT > T_LAND && E.stT < INCOMING + 1.45 && P.dq < 1) {   // 背上油罐的小火团（烧完熄灭）
      const T = tankTopW(), big = E.stT < INCOMING + 1.05 ? 1 : 0;
      for (let k = -3 - big; k <= 3 + big; k++) { const h = RD((4 + big * 2) * (1 - Math.abs(k) / (4.5 + big)) + (H(k, f12) - 0.5) * 2); for (let j = 0; j < h; j++) put(T[0] + k, T[1] - j, j >= h - 1 ? EL[1] : j === 0 ? EL[3] : EL[2]); }
    }
  }
  function drawShot(k, x, y, d, f12) {
    if (k !== 1) return false;                                           // 火球：2×2 白黄芯 + 橙红外沿，闪烁
    put(x, y, EL[0]); put(x + d, y, EL[1]); put(x, y - 1, EL[1]); put(x + d, y - 1, EL[1]); put(x - d, y, EL[2]); put(x - d, y - 1, EL[2]);
    put(x, y + 1, EL[2]); put(x - d, y - 2 + (f12 & 1), EL[3]); put(x - 2 * d, y, EL[3]); put(x + 2 * d, y - 1 + (f12 & 1), EL[2]);
    return true;
  }

  return {
    name: '火焰法师', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.pilotB, M.pilotO, M.pilotW, M.lens], HIT_POINT: [1, -13], EVENTS,
    SFX: { body: 'flesh', how: 'topple', pal: 'fire', style: 'fire', w: 0.65 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
