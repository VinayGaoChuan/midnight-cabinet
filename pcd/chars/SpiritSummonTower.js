// 灵召塔（恶魔 · 召唤师 · 稀有）：一座悬在圆形铁基座上的月白石拱门，门洞里慢慢旋转着一团青蓝魂光裂隙（次元裂隙，发光体）。
// 拱顶两肩的挑檐上各蹲一尊小石兽——左边伏着的月豹、右边坐着的看门犬，就是它召唤出来的那两只；门框两侧 6 盏符文灯是法力条；
// 基座下 3 块碎石绕着缓缓转。不会走路：整座门离地悬浮平移。
// 攻击 = 裂隙收缩再脉动一次，吐出一颗短程魂光弹（仅表现）；技能 = 特性「次元裂隙」：6 盏符文灯逐盏点亮（法力 16%/s），
// 灯全亮时拱门裂开、掉下 3 块碎石（付出生命）→ 裂隙张满整个门洞，一只月豹剪影、一只看门犬剪影先后冲出门洞，落点各开一圈召唤法阵。
// 死亡 = 坍塌：拱顶先裂、裂隙缩成一点，门石一块块竖直落下堆成废墟（死亡套件 chunks，冲击点在头顶上方），最后一点魂光熄灭。
// 身体不用骨架：拱门、基座、碎石、石兽都是本模块自画的部件（候选部件见各函数前的注释）。
PCD.define('SpiritSummonTower', (E) => {
  const { defMat, Sprite, begin, part, sp, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_EMBER, K_TRAIL,
    spawn, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, death, sfx, blitShape, groundShadow, B8 } = E;
  const RD = Math.round;

  // ───── 材质 ─────
  const MOON = [8, 10, 18, 17];                                                   // 月白灰石：stone 色阶往亮处挪两级（勾线 · 石暗 · 骨灰 · 月白）
  const M_STONE = defMat(MOON, 2), M_STONE1 = defMat(MOON, 1), M_STONE_D = defMat(MOON, 1, 0, 1);
  const M_IRON = defMat('iron', 1);                                               // 基座：钢铁暗段
  const M_RIFT = defMat([25, 24, 23, 22], 1, 1), M_CORE = defMat([23, 22, 21, 21], 1, 1);   // 裂隙漩涡 / 白芯（发光体）
  const M_LAMP = defMat([25, 24, 22, 21], 1, 1);                                  // 符文灯、石兽眼、基座符点：1 熄 · 2 暗 · 3 亮 · 4 炽
  const R_EL = FXI.soul, EL = FXR[R_EL], HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(40, 46, 20, 41);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 12, 16], rimRamp: EL, flash: 0, dq: 0, rimAll: 0, skip: new Uint8Array(256) };
  for (const m of [M_RIFT, M_CORE, M_LAMP]) RIM.skip[m] = 1;

  // ───── 姿势 ─────
  // lift：悬浮高度；open：裂隙 -1 缩成一点 · 0 收缩 · 1 常态 · 2 张满门洞 · 3 脉动；sw：漩涡相位 0–7；mana：点亮的符文灯数；
  // lw：待机时「呼吸」到第几盏（6 = 无）；lv：亮灯的档位；ro：碎石绕行相位 0–11；crk：裂纹 0 · 1 拱顶 · 2 满身；eye：石兽眼 0 灭 · 1 · 2 炽
  const P = { lift: 0, bx: 0, open: 1, sw: 0, mana: 0, lw: 6, lv: 3, ro: 0, crk: 0, eye: 1, flash: 0, dq: 0, dq48: 0, rim: 0, st: 0,
    gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY = keyer([['lift', 0, 3], ['bx', -4, 4], ['open', -1, 3], ['sw', 0, 7], ['mana', 0, 6], ['lw', 0, 6], ['lv', 1, 4], ['ro', 0, 11],
    ['crk', 0, 2], ['eye', 0, 2], ['flash', 0, 1], ['dq48', 0, 48], ['rim', 0, 3], ['st', 0, 8]]);
  const T_F = 2 / 12, T_CRK = 1.2, T_COLL = INCOMING + 0.55, T_PILE = INCOMING + 0.95, RIFT_Y = -16;
  const G_LIFT = [1, 2, 2, 1];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(t);
    P.st = st; P.lift = 1; P.bx = 0; P.open = 1; P.sw = 0; P.mana = 0; P.lw = 6; P.lv = 3; P.ro = 0; P.crk = 0; P.eye = 1;
    P.flash = 0; P.dq = 0; P.rim = 1; P.mx = 0; P.flip = 0;
    const idle = () => {                                                                  // 待机个性：漩涡慢转、6 盏灯依次呼吸、碎石绕行
      P.lift = (Math.floor(tq / 0.4 + 1e-6) & 1) ? 2 : 1; P.sw = Math.floor(f12 / 3) & 7; P.lw = Math.floor(f12 / 4) % 6; P.ro = Math.floor(f12 / 6) % 12;
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                                // 悬浮平移：一起一伏，碎石和漩涡跟着转
      const f = gait(tq); P.lift = G_LIFT[f]; P.sw = f * 2; P.ro = f * 3; P.lw = f;
      const w = walkDemo(tq, 8, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                            // 收缩 → 脉动吐弹 → 余波 → 回位
      if (tq < 1 / 12) { idle(); }
      else if (tq < T_F - 1e-6) { P.open = 0; P.sw = 2; P.lv = 2; P.lw = 6; P.lift = 1; }
      else if (tq < T_F + 2 / 12 - 1e-6) { P.open = 3; P.sw = 4 + f12 - 2; P.lw = 6; P.mana = 6; P.lv = 2; P.eye = 2; P.rim = 2; P.lift = 2; P.bx = -1; }
      else if (tq < 0.45) { P.open = 1; P.sw = f12 & 7; P.lift = 2; }
      else { idle(); }
    } else if (st === CHARGE) {                                                            // 符文灯逐盏点亮（16%/s），漩涡越转越快，灯全亮时拱顶裂开
      P.mana = Math.min(6, Math.floor(tq / 0.2 + 1e-6)); P.lv = 3; P.lw = 6;
      P.sw = Math.floor(f12 * (0.5 + tq)) & 7; P.lift = tq < 0.7 ? 1 : 2; P.rim = tq < 0.7 ? 1 : 2; P.eye = tq > 1.0 ? 2 : 1;
      P.ro = Math.floor(f12 / 2) % 12;
      if (tq >= T_CRK - 1e-6) { P.crk = 1; P.open = (f12 & 1) ? 3 : 1; P.lv = 4; P.bx = (f12 & 1) ? -1 : 0; }
    } else if (st === CAST) {                                                              // 裂隙张满门洞
      P.open = 2; P.mana = 6; P.lv = 4; P.rim = 3; P.crk = 1; P.eye = 2; P.lift = 2; P.sw = (f12 * 3) & 7; P.ro = f12 % 12;
    } else if (st === RECOVER) {                                                           // 裂隙收回，灯一盏盏熄灭
      P.open = tq < 0.17 ? 2 : 1; P.mana = Math.max(0, 6 - Math.floor(tq / 0.1 + 1e-6)); P.lv = 3; P.crk = tq < 0.5 ? 1 : 0;
      P.rim = tq < 0.35 ? 2 : 1; P.eye = tq < 0.35 ? 2 : 1; P.sw = (f12 * 2) & 7; P.lift = tq < 0.4 ? 2 : 1; P.ro = f12 % 12;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { P.bx = -2; P.open = 0; P.lv = 1; P.lw = 6; P.eye = 0; P.ro = 3; P.rim = 0; P.flash = h < 1 / 12 ? 1 : 0; P.lift = 1; }
      else if (h < 0.35) { P.bx = -1; P.open = 0; P.lw = 6; P.ro = 2; P.lift = 1; }
      else { idle(); P.lift = 1; }
    } else if (st === DEATH) {                                                             // 受击 → 拱顶裂开、裂隙收缩、基座下沉 → 坍塌
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.2) { P.bx = -2; P.open = 0; P.crk = 1; P.eye = 0; P.lv = 1; P.lw = 6; P.flash = d < 1 / 12 ? 1 : 0; P.ro = 3; }
      else if (d < T_COLL - INCOMING - 1e-6) { P.bx = (f12 & 1) ? -1 : -2; P.open = -1; P.crk = 2; P.eye = 0; P.lw = 6; P.lift = d < 0.4 ? 1 : 0; P.ro = 4 + (f12 & 1); }
      else P.dq = 1;                                                                       // 之后由死亡套件（碎块落下成堆）接管
    } else if (st === REVIVE) {
      idle();
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
    }
    P.dq48 = RD(P.dq * 48);
    P.gx = P.bx; P.gy = RIFT_Y - P.lift;                                                   // 发光体 = 门洞里的裂隙
    KEY(P);
  }

  // ───── 画（从后往前：后半圈碎石 → 基座 → 拱门（含符文灯、裂纹）→ 裂隙 → 拱心石 → 月豹石兽 → 看门犬石兽 → 前半圈碎石）─────
  let YO = 0;
  const S = (x, y, m, t) => sp(x, y + YO, m, t);
  const RUN = (y, x0, x1, m, t) => { for (let x = x0; x <= x1; x++) S(x, y, m, t); };
  const CY = -20, RO = 9.5, RI = 5.6;
  const inArch = (x, y) => { const d = y <= CY ? Math.hypot(x, y - CY) : Math.abs(x); return d > RI && d <= RO; };
  const inHole = (x, y) => (y <= CY ? Math.hypot(x, y - CY) <= RI : Math.abs(x) <= 5);
  // 候选部件：环绕碎石（3 块绕基座下方的扁椭圆转；back = 后半圈，画在基座之前、暗一级）
  function rocks(back) {
    for (let k = 0; k < 3; k++) {
      const a = (P.ro / 12 + k / 3) * 6.2832, s = Math.sin(a); if ((s < 0) !== back) continue;
      const x = RD(Math.cos(a) * 8), y = back ? -3 : -1, m = back ? M_STONE_D : M_STONE1;
      part(); S(x, y - 1, m, 0); S(x + 1, y - 1, m, 0); S(x - 1, y, m, 0); S(x, y, m, 0); S(x + 1, y, m, 0);
    }
  }
  // 候选部件：漂浮圆基座（铁盘，顶面一圈亮沿，正面 5 个魂光符点随法力亮起）
  function base() {
    part();
    RUN(-8, -9, 9, M_IRON, 4); RUN(-7, -11, 11, M_IRON, 0); RUN(-6, -11, 11, M_IRON, 0); RUN(-5, -10, 10, M_IRON, 0); RUN(-4, -7, 7, M_IRON, 0);
    S(-11, -7, M_IRON, 4); S(11, -7, M_IRON, 2);
    const lit = P.mana >= 6 ? 3 : P.mana >= 3 ? 2 : 1;
    for (const x of [-8, -4, 0, 4, 8]) S(x, -6, M_LAMP, x === 0 && P.open >= 2 ? 4 : lit);
  }
  const LAMPS = [[-8, -11], [7, -11], [-8, -15], [7, -15], [-8, -19], [7, -19]];
  const CRACK1 = [[0, -29], [-1, -28], [-1, -27], [-2, -26], [-3, -25], [-4, -24], [-4, -23], [5, -26], [6, -25], [6, -24]];
  const CRACK2 = [[-7, -21], [-7, -20], [-6, -19], [-6, -18], [-7, -17], [7, -14], [8, -13], [8, -12], [7, -11], [2, -28], [3, -27], [-9, -9], [9, -9]];
  // 候选部件：月白石拱门（两根门柱 + 半圆拱 + 肩部挑檐；砌缝压暗调，拱石按放射线分块；门柱正面嵌 6 盏符文灯，是法力条）
  function gate() {
    part();
    for (let y = -30; y <= -9; y++) for (let x = -10; x <= 10; x++) if (inArch(x, y)) S(x, y, M_STONE, 0);
    RUN(-27, -12, -6, M_STONE, 0); RUN(-27, 6, 12, M_STONE, 0); RUN(-26, -11, -9, M_STONE, 0); RUN(-26, 9, 11, M_STONE, 0);   // 挑檐（石兽的座）+ 托石
    RUN(-27, -12, -7, M_STONE, 4); RUN(-27, 7, 11, M_STONE, 4);
    RUN(-9, -10, -5, M_STONE, 0); RUN(-9, 5, 10, M_STONE, 0);                                                                 // 柱脚
    for (const y of [-13, -17]) { RUN(y, -9, -6, M_STONE, 2); RUN(y, 6, 9, M_STONE, 2); }                                   // 砌缝
    for (const [x, y] of [[-7, -14], [-7, -15], [8, -14], [8, -15], [-6, -18], [7, -18], [-6, -12], [7, -12]]) S(x, y, M_STONE, 2);
    for (const a of [-1.05, -0.42, 0.42, 1.05]) for (let r = RI + 0.6; r <= RO - 0.4; r += 0.5) S(RD(Math.sin(a) * r), RD(CY - Math.cos(a) * r), M_STONE, 2);   // 拱石分块
    for (let i = 0; i < 6; i++) {                                                          // 符文灯（2×2）
      const [x, y] = LAMPS[i], lv = i < P.mana ? P.lv : i === P.lw ? 2 : 1;
      const t0 = lv === 4 ? 4 : lv === 3 ? 4 : lv === 2 ? 3 : 2, t1 = lv === 4 ? 4 : lv === 3 ? 3 : lv === 2 ? 2 : 1;
      S(x, y, M_LAMP, t0); S(x + 1, y, M_LAMP, t1); S(x, y + 1, M_LAMP, t1); S(x + 1, y + 1, M_LAMP, lv >= 3 ? 3 : 1);
    }
    if (P.crk >= 1) for (const [x, y] of CRACK1) S(x, y, M_STONE, 1);
    if (P.crk >= 2) for (const [x, y] of CRACK2) S(x, y, M_STONE, 1);
  }
  // 候选部件：旋转裂隙（椭圆内两条旋臂，相位 sw 转动；白芯；open 决定大小，2 = 填满门洞）
  function rift() {
    if (P.open < 0) { part(); S(0, RIFT_Y, M_CORE, 4); S(-1, RIFT_Y, M_RIFT, 2); S(1, RIFT_Y, M_RIFT, 2); S(0, RIFT_Y - 1, M_RIFT, 2); S(0, RIFT_Y + 1, M_RIFT, 2); return; }
    part();
    const full = P.open === 2, rx = [1.2, 1.9, 5.6, 2.9][P.open], ry = [3, 5.6, 9.5, 7][P.open], cy = full ? -16.5 : RIFT_Y;
    for (let y = -26; y <= -9; y++) for (let x = -6; x <= 6; x++) {
      if (!inHole(x, y)) continue;
      const u = x / rx, v = (y - cy) / ry, r = Math.hypot(u, v); if (!full && r > 1) continue;
      const rr = Math.min(1, r); let w = (Math.atan2(v, u) / 6.2832 * 2 + rr * 1.3 - P.sw / 8) % 1; if (w < 0) w += 1;
      if (rr < 0.26) S(x, y, M_CORE, rr < 0.13 || full ? 4 : 3);
      else if (!full && rr > 0.84) S(x, y, M_RIFT, 1);
      else S(x, y, M_RIFT, w < 0.34 ? 4 : w < 0.62 ? 3 : full ? 3 : 2);
    }
  }
  // 候选部件：拱心石（凸出拱顶 2 格，中间一枚魂光符）
  function keystone() {
    part(); for (let y = -31; y <= -27; y++) RUN(y, -1, 1, M_STONE1, 0); S(0, -32, M_STONE1, 4);
    S(0, -30, M_LAMP, P.eye === 0 ? 1 : P.eye === 2 || P.mana >= 6 ? 4 : 3);
  }
  // 候选部件：伏卧石兽（ASCII 小图：s 石 · E 眼（魂光）· t 尾 · h 亮面），左 = 月豹（朝外伏、长尾卷起），右 = 看门犬（坐姿、方头、剪耳）
  const LEO = ['........t', '.s.s...t.', 'ssss...t.', 'sEss..t..', 'ssssss...', 's.sssss..'];
  const DOG = ['...s.s..', '...ssss.', '...hEsss', '..ssss..', '.sssss..', 'ssssss..', 'sss.ss..'];
  function beast(map, x0, yBot) {
    part();
    const eyeT = P.eye === 0 ? 1 : P.eye === 2 ? 4 : 3;
    for (let r = 0; r < map.length; r++) { const y = yBot - (map.length - 1 - r), row = map[r]; for (let i = 0; i < row.length; i++) {
      const c = row[i]; if (c === '.') continue; const x = x0 + i;
      if (c === 'E') S(x, y, M_LAMP, eyeT); else S(x, y, M_STONE1, c === 'h' ? 4 : 0);
    } }
  }
  function drawHero() {
    begin(hero, P.bx, 0); YO = -P.lift;
    rocks(true); base(); gate(); rift(); keystone();
    beast(LEO, -13, -28); beast(DOG, 6, -28);
    rocks(false);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 召唤物剪影（施放时冲出门洞；只当形状用，blitShape 单色）─────
  const M_SIL = defMat('stone', 1);
  const SIL = { leo: [new Sprite(22, 10, 11, 9), new Sprite(22, 10, 11, 9)], dog: [new Sprite(18, 12, 9, 11), new Sprite(18, 12, 9, 11)] };
  function silRun(y, x0, x1) { for (let x = x0; x <= x1; x++) sp(x, y, M_SIL, 0); }
  function buildSil() {
    for (let f = 0; f < 2; f++) {
      begin(SIL.leo[f], 0, 0); part();                                                    // 月豹：长身低伏、尖耳、长尾
      silRun(-4, -4, 4); silRun(-3, -5, 5); silRun(-2, -4, 4); silRun(-5, 5, 7); silRun(-4, 5, 8); silRun(-3, 6, 8); sp(6, -6, M_SIL, 0); sp(8, -6, M_SIL, 0);
      for (const [x, y] of [[-5, -4], [-6, -5], [-7, -5], [-8, -6], [-9, -6], [-10, -7]]) sp(x, y, M_SIL, 0);
      const L = f ? [[3, -1], [3, 0], [4, 0], [-2, -1], [-2, 0], [-1, 0]] : [[5, -1], [6, -1], [7, 0], [8, 0], [-4, -1], [-5, -1], [-6, 0], [-7, 0]];
      for (const [x, y] of L) sp(x, y, M_SIL, 0);
      bake(SIL.leo[f], { rim: 0, flash: 0, dq: 0 });
      begin(SIL.dog[f], 0, 0); part();                                                    // 看门犬：方头大獒、剪耳、短尾、胸宽
      for (let y = -5; y <= -2; y++) silRun(y, -4, 3); silRun(-6, -3, 3);
      for (let y = -7; y <= -4; y++) silRun(y, 3, 7); sp(4, -8, M_SIL, 0); sp(6, -8, M_SIL, 0);
      sp(-5, -5, M_SIL, 0); sp(-6, -6, M_SIL, 0);
      const D = f ? [[1, -1], [2, -1], [2, 0], [-2, -1], [-3, -1], [-2, 0]] : [[3, -1], [4, -1], [5, 0], [-4, -1], [-5, 0], [-6, 0]];
      for (const [x, y] of D) sp(x, y, M_SIL, 0);
      bake(SIL.dog[f], { rim: 0, flash: 0, dq: 0 });
    }
  }
  buildSil();

  // ───── 特效 ─────
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  // 碎石（蓄满时从拱门上掉下的 3 块）：自己的小池子，落地弹一下后平躺、抖动消散
  const DBN = 6, dbOn = new Uint8Array(DBN), dbX = new Float32Array(DBN), dbY = new Float32Array(DBN), dbVX = new Float32Array(DBN), dbVY = new Float32Array(DBN), dbAge = new Float32Array(DBN), dbB = new Uint8Array(DBN);
  function drop(x, y, vx, vy) { let i = 0; for (; i < DBN - 1 && dbOn[i]; i++); dbOn[i] = 1; dbX[i] = x; dbY[i] = y; dbVX[i] = vx; dbVY[i] = vy; dbAge[i] = 0; dbB[i] = 0; }
  // 召唤剪影：0 月豹 · 1 看门犬
  const SUM = [{ t0: 0.02, dur: 0.22, from: 6, to: 26, kind: 'leo' }, { t0: 0.14, dur: 0.24, from: 4, to: 16, kind: 'dog' }];
  let sumT = -1, sumLand = [0, 0], chargeAcc = 0, moteAcc = 0, trailAcc = 0, riseAcc = 0, mzT = 9, ptT = -1;
  function onEnter(s) {
    if (s !== CAST) return;
    const cx = wx(0), cy = wy(-15 - P.lift);
    releaseOrbit(30, 80, 0.3, 0.6, { pts: 1, up: 4 });
    burst(cx, cy, 26, 40, 110, 0.3, 0.7, R_EL, 8); fx.cross(cx, cy, 7, R_EL, 0.3); ring(cx, cy, 1, R_EL);
    sumT = 0; sumLand[0] = sumLand[1] = 0;
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_F) {                                                       // 裂隙脉动，吐出一颗魂光弹
      const x = wx(1), y = RD(wy(RIFT_Y - P.lift));
      shoot(1, x, y, 150, DUMMY_X - 3, R_EL, 0, { trail: { every: 2, life: [0.15, 0.3] } });
      burst(x, y, 8, 25, 70, 0.15, 0.35, R_EL, 0); mzT = 0;
      sfx('swing', { kind: 'staff', w: 0.4 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === CHARGE && t === T_CRK) {                                                     // 灯全亮：拱门裂开，掉下 3 块碎石（付出 400 生命）
      for (const [x, y, vx] of [[-3, -24, -20], [5, -23, 25], [-6, -18, -30]]) drop(wx(x), wy(y - 2), (P.flip ? -vx : vx), -30);
      burst(wx(0), wy(-26), 10, 20, 60, 0.3, 0.6, FXI.dust, 10); shake(0.12, 1);
    }
    if (s === DEATH && Math.abs(t - T_COLL) < 1e-9) {                                     // 坍塌：门石竖直落下
      poseAt(DEATH, T_COLL - 1 / 12, T_COLL - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('chunks', { chunk: 4, power: 0.35, fromX: 0, fromY: -70, fadeAt: 1.45, fadeDur: 0.6 });
      ptT = 0; burst(wx(0), wy(-15), 10, 20, 60, 0.3, 0.6, FXI.dust, 6); shake(0.14, 2);
    }
    if (s === DEATH && Math.abs(t - T_PILE) < 1e-9) {                                     // 废墟落地扬尘
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 14 + Math.random() * 28, HY - 1, (Math.random() - 0.5) * 34, -6 - Math.random() * 12, 0.4 + Math.random() * 0.5, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.8 });
    }
  }
  const EVENTS = [[], [], [T_F], [T_CRK], [], [], [], [T_COLL, T_PILE], []];
  function impactOn(k, x, y) { if (k === 1) { burst(x, y, 12, 30, 90, 0.2, 0.5, R_EL, 8); fx.cross(x, y, 3, R_EL, 0.2); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.4 }); } }
  function hurtFx(s) {                                                                     // 石门受击：火花 + 碎石屑 + 震出的魂光
    const hx = wx(1), hy = HY - 17; burst(hx, hy, s === DEATH ? 24 : 16, 50, 140, 0.25, 0.55, FXI.impact, 20); burst(hx, hy, s === DEATH ? 12 : 6, 30, 80, 0.3, 0.6, FXI.dust, 12);
    burst(wx(0), wy(-15), 5, 15, 45, 0.3, 0.6, R_EL, 10); shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function landSummon(j) {                                                                 // 剪影落地：一圈召唤法阵 + 魂光外爆
    const x = HX + SUM[j].to * (P.flip ? -1 : 1);
    fx.circle(x, HY - 1, 7, 2, R_EL, 0.9, j ? -1 : 1, 0); burst(x, HY - 4, 18, 30, 100, 0.3, 0.7, R_EL, 18); fx.cross(x, HY - 5, 4, R_EL, 0.25);
    ring(x, HY - 3, 0, R_EL); if (j) shake(0.12, 1); sfx('impact', { pal: 'arcane', w: j ? 0.7 : 0.55 });
  }
  function stepFX(dt, state, t) {
    if (state === CHARGE) {                                                                // 魂光螺旋汇进裂隙
      chargeAcc += dt * (14 + 22 * clamp01(t / 1.2));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 10 + Math.random() * 10; spawn(K_SPIRAL_PT, wx(0), wy(RIFT_Y - P.lift), r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if (state === IDLE || state === RECOVER) {                                            // 待机：裂隙里偶尔飘出魂光
      moteAcc += dt * (state === RECOVER ? 10 : 3);
      while (moteAcc >= 1) { moteAcc -= 1; spawn(K_EMBER, wx(RD(Math.random() * 4 - 2)), wy(RIFT_Y - P.lift - 2), Math.random() * 6 - 3, -8 - Math.random() * 8, 0.6 + Math.random() * 0.5, R_EL); }
    }
    if (state === MOVE) {                                                                  // 悬浮：基座下拖 1–2 颗魂光
      trailAcc += dt * 9;
      while (trailAcc >= 1) { trailAcc -= 1; spawn(K_TRAIL, wx(RD(Math.random() * 10 - 5)), HY - 2 - P.lift + RD(Math.random()), (P.flip ? 1 : -1) * (6 + Math.random() * 6), 3, 0.35, R_EL); }
    }
    if (state === DEATH && t > T_PILE && t < INCOMING + 2.4) { riseAcc += dt * 18; while (riseAcc >= 1) { riseAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 24, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -12 - Math.random() * 12, 0.8 + Math.random() * 0.7, R_EL); } }
    if (sumT >= 0) {
      sumT += dt;
      for (let j = 0; j < 2; j++) if (!sumLand[j] && sumT >= SUM[j].t0 + SUM[j].dur) { sumLand[j] = 1; landSummon(j); }
      if (sumT > 1.2) sumT = -1;
    }
    for (let i = 0; i < DBN; i++) {
      if (!dbOn[i]) continue; dbAge[i] += dt;
      if (dbB[i] < 2) { dbVY[i] += 300 * dt; dbX[i] += dbVX[i] * dt; dbY[i] += dbVY[i] * dt; }
      if (dbB[i] < 2 && dbY[i] >= HY - 1 && dbVY[i] > 0) {
        dbY[i] = HY - 1; if (dbB[i] === 0) { burst(dbX[i], HY - 1, 4, 10, 30, 0.2, 0.4, FXI.dust, 8); }
        dbB[i]++; dbVY[i] *= -0.3; dbVX[i] *= 0.4; if (dbB[i] >= 2) { dbVY[i] = 0; dbVX[i] = 0; }
      }
      if (dbAge[i] > 2.2) dbOn[i] = 0;
    }
    mzT += dt; if (ptT >= 0) ptT += dt;
  }
  function fxReset() { dbOn.fill(0); sumT = -1; sumLand[0] = sumLand[1] = 0; chargeAcc = 0; moteAcc = 0; trailAcc = 0; riseAcc = 0; mzT = 9; ptT = -1; }
  function fxBack(f12) {
    if (P.dq < 1) { groundShadow(wx(0), 9, 3 + P.lift); floorGlow(wx(P.gx), P.rim, EL, f12); }
    shotFloorGlow(f12);
  }
  function drawShot(k, x, y, d, f12, Rr) {                                                 // 魂光弹：白芯 + 青蓝十字，尾端闪烁
    if (k !== 1) return false;
    put(x, y, 21); put(x + d, y, 22); put(x, y - 1, 22); put(x, y + 1, 22); put(x - d, y, 23); put(x - 2 * d, y, 24);
    if (f12 & 1) { put(x + d, y - 1, 23); put(x - d, y + 1, 23); } else { put(x + d, y + 1, 23); put(x - d, y - 1, 23); } return true;
  }
  function fxFront(f12) {
    for (let i = 0; i < DBN; i++) {                                                        // 掉落的门石（2×2）
      if (!dbOn[i]) continue; const x = RD(dbX[i]), y = RD(dbY[i]), fade = clamp01((dbAge[i] - 1.6) / 0.5);
      if (fade > 0 && B8[((y + 64) & 7) * 8 + ((x + 64) & 7)] < fade) continue;
      put(x, y - 1, 17); put(x + 1, y - 1, 18); put(x, y, 18); put(x + 1, y, 10); if (i === 1) put(x + 2, y, 8);
    }
    if (sumT >= 0) {                                                                       // 月豹、看门犬剪影冲出门洞
      const sg = P.flip ? -1 : 1;
      for (let j = 0; j < 2; j++) {
        const s = SUM[j], q = (sumT - s.t0) / s.dur; if (q < 0) continue;
        const hold = sumT - s.t0 - s.dur, dq = clamp01((hold - 0.35) / 0.35); if (dq >= 1) continue;
        const qq = ease.out(clamp01(q)), x = RD(HX + sg * (s.from + (s.to - s.from) * qq)), air = q < 1 ? RD(Math.sin(clamp01(q) * Math.PI) * 3) : 0;
        const legs = q < 1 ? (Math.floor(sumT * 12 + 1e-6) & 1) : 0, spr = SIL[s.kind][legs];
        if (q < 1) { blitShape(spr, x - sg * 4, HY - air, P.flip, EL[3], 0.5); blitShape(spr, x - sg * 2, HY - air, P.flip, EL[2], 0.25); }
        blitShape(spr, x, HY - air, P.flip, q < 0.5 ? EL[0] : hold < 0.2 ? EL[0] : EL[1], dq);
        if (dq < 0.5) { const ex = x + sg * (s.kind === 'leo' ? 7 : 5), ey = HY - air - (s.kind === 'leo' ? 4 : 6); put(ex, ey, 21); }
      }
    }
    if (mzT < 2 / 12 && P.dq < 1) {                                                        // 吐弹的口光（2 帧）
      const x = wx(3), y = RD(wy(RIFT_Y - P.lift)), c = mzT < 1 / 12 ? EL[0] : EL[1];
      for (let r = 1; r <= 3; r++) { put(x + r, y, r < 3 ? c : EL[2]); put(x, y - r, r < 2 ? c : EL[2]); put(x, y + r, r < 2 ? c : EL[2]); } put(x, y, 21);
    }
    if (ptT >= 0 && ptT < 0.4) {                                                           // 裂隙缩成一点后熄灭
      const x = wx(0), y = wy(RIFT_Y), c = ptT < 0.12 ? 21 : ptT < 0.25 ? 22 : 24;
      put(x, y, c); if (ptT < 0.2) { put(x - 1, y, 22); put(x + 1, y, 22); put(x, y - 1, 22); put(x, y + 1, 22); }
    }
  }

  return {
    name: '灵召塔', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_RIFT, M_CORE, M_LAMP], HIT_POINT: [1, -17], EVENTS,
    deathKit: { mode: 'chunks', at: T_COLL },
    SFX: { body: 'stone', how: 'collapse', pal: 'arcane', style: 'summon', w: 0.7, hover: 1 },
    REVIVE: { dy: -16, ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot, hurtFx,
  };
});
