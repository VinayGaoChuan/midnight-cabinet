// 地狱召唤塔（恶魔 · 召唤师 · 神话；灵召塔的升级）：同一座拱门加高加厚成黑曜赤岩的地狱门，本组最大的单位（约 40 格高、26 格宽）。
// 拱顶两肩的石兽变成魔豹（左，獠牙）与邪犬（右，长吻）的骷髅兽首，各长一支向外弯的巨角伸出门框 5 格；
// 门框缠 4 根粗铁链（外侧两根垂到地面堆开，门柱正面两根斜缠后垂下）；6 盏符文灯换成 6 颗燃烧的颅灯（法力条）；
// 门洞里是熔血漩涡，裂缝往下淌熔岩；底座长出四只石爪足，蹒跚挪步（对角两只一组交替抬起，一晃一顿，每步 3 颗尘）。
// 攻击 = 门里伸出一只火爪影向前虚抓，甩出三道爪痕（仅表现）；技能 = 特性「超级裂隙」：颅灯逐颗燃起，锁链一根根崩断（每断一根掉一块岩、震屏 1 格），
// 熔岩顺裂缝流下 → 血红火柱从门洞自下而上冲天，魔豹与邪犬剪影扑出，落点地裂 + 火环 + 熔岩飞溅。
// 死亡 = 内爆：整座门被自己的裂隙吸进去——像素由外向内螺旋收向门心，最后一点闪白熄灭，锁链落地堆开。
// 身体不用骨架：拱门、爪足、锁链、兽首、颅灯都是本模块自画的部件（候选部件见各函数前的注释）。
PCD.define('HellSummonTower', (E) => {
  const { defMat, Sprite, begin, part, sp, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_EMBER, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx, blitShape, B8, ramp } = E;
  const RD = Math.round;

  // ───── 材质 ─────
  const OBS = ramp(['#0c0606', '#2a1212', '#4a1e1a', '#6e2e24']);                  // 黑曜赤岩（勾线 · 暗 · 基 · 亮）
  const M_ROCK = defMat(OBS, 2), M_ROCK1 = defMat(OBS, 1), M_ROCK_D = defMat(OBS, 1, 0, 1);
  const M_BONE = defMat('bone', 1), M_HORN = defMat([0, 55, 56, 13], 1), M_IRON = defMat('iron', 1), M_IRON_D = defMat('iron', 1, 0, 1);
  const M_RIFT = defMat([55, 56, 57, 58], 1, 1), M_CORE = defMat([45, 46, 47, 21], 1, 1);      // 熔血漩涡 / 熔岩白芯（发光体）
  const M_LAVA = defMat([44, 45, 46, 47], 1, 1);                                           // 熔岩缝、颅灯火、兽首眼火：1 熄 · 2 暗 · 3 亮 · 4 炽
  const M_CLAW = defMat([55, 45, 46, 47], 1, 1);                                           // 门里伸出的火爪影
  const R_EL = FXI.blood, EL = FXR[R_EL], FIRE = FXR[FXI.fire], HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(50, 48, 25, 45);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 9, 13, 18], rimRamp: EL, rimAll: 1, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const m of [M_RIFT, M_CORE, M_LAVA, M_CLAW, M_HORN, M_IRON, M_IRON_D, M_BONE]) RIM.skip[m] = 1;

  // ───── 姿势 ─────
  // yb：门体上下（-1 抬起 · 0 · 1 顿地）；bx：门体水平（击退、晃）；ft：爪足步态帧 0–3（4 = 四足站定）；
  // open：裂隙 -1 一点 · 0 收缩 · 1 常态 · 2 张满门洞 · 3 脉动；sw：漩涡相位；mana：燃起的颅灯数；lw：待机时忽闪的那颗（6 = 无）；lv：灯火档；
  // brk：崩断的锁链数（按 BRK_ORDER 的顺序）；cs：锁链摆 -1..1；lava：熔岩流下的长度 0–3；claw：爪影 0 无 · 1 扒门框 · 2 缩在门里 · 3 伸出抓 · 4 收回中；
  // crk：裂纹 0–2；eye：兽首眼火 0–2；imp：内爆进度 0–12
  const P = { yb: 0, bx: 0, ft: 4, open: 1, sw: 0, mana: 0, lw: 6, lv: 3, brk: 0, cs: 0, lava: 1, claw: 0, crk: 0, eye: 1, imp: 0,
    flash: 0, dq: 0, dq48: 0, rim: 0, st: 0, gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY = keyer([['yb', -1, 1], ['bx', -4, 4], ['ft', 0, 4], ['open', -1, 3], ['sw', 0, 7], ['mana', 0, 6], ['lw', 0, 6], ['lv', 1, 4],
    ['brk', 0, 4], ['cs', -1, 1], ['lava', 0, 3], ['claw', 0, 4], ['crk', 0, 2], ['eye', 0, 2], ['imp', 0, 12],
    ['flash', 0, 1], ['dq48', 0, 48], ['rim', 0, 3], ['st', 0, 8]]);
  const T_F = 2 / 12, T_BRK = [0.5, 0.7, 0.9, 1.1], BRK_ORDER = [2, 3, 0, 1], RIFT_Y = -21;
  const T_FLARE = INCOMING + 0.2, T_IMP = INCOMING + 0.35, T_IMPEND = INCOMING + 1.15, T_CHLAND = T_IMP + 0.34;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(t);
    P.st = st; P.yb = 0; P.bx = 0; P.ft = 4; P.open = 1; P.sw = 0; P.mana = 0; P.lw = 6; P.lv = 3; P.brk = 0; P.cs = 0; P.lava = 1; P.claw = 0;
    P.crk = 0; P.eye = 1; P.imp = 0; P.flash = 0; P.dq = 0; P.rim = 1; P.mx = 0; P.flip = 0;
    const idle = () => {                                                                   // 待机个性：漩涡慢转、颅灯忽闪、锁链咔啦颤、爪影不时扒一下门框
      const ph = Math.floor(tq / 0.4 + 1e-6);
      P.yb = (ph & 1) ? -1 : 0; P.cs = [0, 1, 0, -1][ph & 3]; P.sw = Math.floor(f12 / 3) & 7; P.lw = Math.floor(f12 / 5) % 6;
      if (tq >= 1.5 - 1e-6 && tq < 2.0 - 1e-6) { P.claw = 1; P.eye = 2; P.cs = (f12 & 1) ? 1 : -1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                                 // 四只石爪足蹒跚：接触帧顿地、经过帧门体一晃
      const f = gait(tq); P.ft = f; P.yb = (f & 1) ? -1 : 0; P.bx = f === 1 ? 1 : f === 3 ? -1 : 0; P.cs = f === 1 ? -1 : f === 3 ? 1 : 0;
      P.sw = f * 2; P.lw = f;
      const w = walkDemo(tq, 6, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                             // 爪影缩进门里 → 伸出虚抓 → 收回
      if (tq < 1 / 12) { idle(); }
      else if (tq < T_F - 1e-6) { P.open = 0; P.claw = 2; P.sw = 2; P.lv = 2; P.eye = 2; P.bx = -1; }
      else if (tq < T_F + 2 / 12 - 1e-6) { P.open = 3; P.claw = 3; P.sw = 4 + f12 - 2; P.eye = 2; P.rim = 2; P.bx = 1; P.cs = -1; }
      else if (tq < 0.45) { P.open = 1; P.claw = 4; P.sw = f12 & 7; P.cs = 1; }
      else { idle(); }
    } else if (st === CHARGE) {                                                             // 颅灯逐颗燃起，锁链一根根崩断，熔岩顺裂缝流下
      P.mana = Math.min(6, Math.floor(tq / 0.2 + 1e-6)); P.lv = 3; P.lw = 6;
      P.sw = Math.floor(f12 * (0.5 + tq * 1.2)) & 7; P.rim = tq < 0.7 ? 1 : 2; P.eye = tq > 0.6 ? 2 : 1;
      P.brk = 0; for (const tb of T_BRK) if (tq >= tb - 1e-6) P.brk++;
      P.lava = tq < 0.5 ? 1 : tq < 0.9 ? 2 : 3; P.crk = tq < 0.9 ? 0 : 1;
      P.cs = (f12 & 1) ? 1 : -1; P.open = tq >= 1.1 - 1e-6 ? ((f12 & 1) ? 3 : 1) : 1;
      if (tq >= 1.1 - 1e-6) { P.lv = 4; P.bx = (f12 & 1) ? -1 : 0; P.yb = (f12 & 1) ? 1 : 0; }
    } else if (st === CAST) {                                                               // 裂隙张满门洞，火柱冲天
      P.open = 2; P.mana = 6; P.lv = 4; P.rim = 3; P.brk = 4; P.lava = 3; P.crk = 1; P.eye = 2; P.sw = (f12 * 3) & 7; P.yb = f12 < 2 ? 1 : 0;
    } else if (st === RECOVER) {                                                            // 裂隙收回、颅灯一颗颗熄、断链重新垂下
      P.open = tq < 0.17 ? 2 : 1; P.mana = Math.max(0, 6 - Math.floor(tq / 0.1 + 1e-6)); P.lv = 3; P.crk = tq < 0.5 ? 1 : 0;
      P.brk = tq < 0.5 ? 4 : 0; P.lava = tq < 0.35 ? 3 : tq < 0.55 ? 2 : 1; P.cs = tq >= 0.5 - 1e-6 && tq < 0.6 ? 1 : 0;
      P.rim = tq < 0.35 ? 2 : 1; P.eye = tq < 0.35 ? 2 : 1; P.sw = (f12 * 2) & 7;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { P.bx = -2; P.open = 0; P.lv = 1; P.lw = 6; P.eye = 0; P.cs = 1; P.rim = 0; P.flash = h < 1 / 12 ? 1 : 0; P.claw = 0; }
      else if (h < 0.35) { P.bx = -1; P.open = 0; P.lw = 6; P.cs = -1; }
      else { idle(); P.claw = 0; }
    } else if (st === DEATH) {                                                              // 受击 → 裂隙暴涨、满身裂纹 → 被自己的裂隙吸进去
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; P.claw = 0; }
      else if (d < 0.2) { P.bx = -2; P.open = 0; P.crk = 1; P.eye = 0; P.lv = 1; P.lw = 6; P.cs = 1; P.flash = d < 1 / 12 ? 1 : 0; }
      else if (tq < T_IMP - 1e-6) { P.bx = (f12 & 1) ? -1 : 0; P.open = 3; P.crk = 2; P.eye = 2; P.lv = 4; P.mana = 6; P.lava = 3; P.rim = 2; P.cs = (f12 & 1) ? 1 : -1; P.yb = 1; }
      else if (tq < T_IMPEND - 1e-6) {                                                      // 内爆：锁链先脱落（交给 fxFront 画落地），门体螺旋收进门心
        P.open = 2; P.crk = 2; P.eye = 2; P.lv = 4; P.mana = 6; P.lava = 3; P.brk = 4; P.rim = 0; P.yb = 1;
        P.imp = Math.min(12, 1 + Math.floor((tq - T_IMP) / (T_IMPEND - T_IMP) * 12 + 1e-6));
      } else P.dq = 1;
    } else if (st === REVIVE) {
      idle(); P.claw = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
    }
    P.dq48 = RD(P.dq * 48);
    P.gx = P.bx; P.gy = RIFT_Y + P.yb;                                                     // 发光体 = 门洞里的熔血裂隙
    KEY(P);
  }

  // ───── 画（从后往前：后排爪足 → 外侧锁链 → 底座 → 前排爪足 → 拱门（含颅灯、裂纹、熔岩缝）→ 裂隙 → 拱心石 → 两颗兽首与巨角 → 门柱正面的锁链 → 爪影）─────
  let YO = 0, XO = 0;
  const S = (x, y, m, t) => sp(x + XO, y + YO, m, t);
  const RUN = (y, x0, x1, m, t) => { for (let x = x0; x <= x1; x++) S(x, y, m, t); };
  const CY = -26, RO = 13, RI = 7.5;
  const inArch = (x, y) => { const d = y <= CY ? Math.hypot(x, y - CY) : Math.abs(x); return d > RI && d <= RO; };
  const inHole = (x, y) => (y <= CY ? Math.hypot(x, y - CY) <= RI : Math.abs(x) <= 7);
  // 候选部件：石爪足（桩 + 三趾 + 骨白爪尖；u 抬起格数、s 前后错位；落在地面线上，不随门体起伏）
  const FEET = [[-11, 0], [4, 0], [-4, 1], [11, 1]];                                        // [x, 组]：组 0 = 近侧对角（亮），组 1 = 远侧对角（暗）
  function foot(cx, u, s, m) {
    part(); const x = cx + s, top = -4 + P.yb;
    for (let y = top; y <= -2 - u; y++) { S(x - XO, y - YO, m, 0); S(x + 1 - XO, y - YO, m, 0); }
    for (let k = -1; k <= 2; k++) S(x + k - XO, -1 - u - YO, m, 0);
    S(x - 1 - XO, -u - YO, m, 0); S(x + 1 - XO, -u - YO, m, 0);
    S(x + 3 - XO, -u - YO, M_BONE, 4); S(x + 3 - XO, -1 - u - YO, M_BONE, 3);
  }
  function feet(group) {
    const f = P.ft;
    for (const [x, g] of FEET) {
      if (g !== group) continue;
      const lift = (f === 1 && g === 1) || (f === 3 && g === 0) ? 3 : 0;                     // 经过帧：一组对角抬起 2 格
      const s = f === 4 ? 0 : f === 0 ? (g === 0 ? 2 : -2) : f === 2 ? (g === 0 ? -2 : 2) : 0;   // 两个接触帧前后互换
      foot(x, lift, s, g === 0 ? M_ROCK1 : M_ROCK_D);
    }
  }
  // 候选部件：底座（黑曜厚板，正面熔岩缝）
  function base() {
    part();
    RUN(-9, -12, 12, M_ROCK, 0); for (let y = -8; y <= -5; y++) RUN(y, y === -5 ? -13 : -14, y === -5 ? 13 : 14, M_ROCK, 0); RUN(-9, -12, 12, M_ROCK, 4);
    for (const x of [-7, 7]) S(x, -7, M_ROCK, 2);
  }
  const LAMPS = [[-12, -26], [9, -26], [-12, -20], [9, -20], [-12, -14], [9, -14]];
  const CRACK1 = [[0, -39], [1, -38], [1, -37], [2, -36], [-6, -35], [-7, -34], [-7, -33], [6, -34], [7, -33]];
  const CRACK2 = [[-10, -30], [-10, -29], [-11, -28], [-11, -27], [10, -30], [11, -29], [11, -28], [-9, -12], [-10, -11], [10, -11], [11, -10], [-3, -8], [4, -7]];
  // 候选部件：地狱门（厚门柱 + 半圆厚拱 + 伸出门框的挑檐；拱石放射分块、砌缝；门柱嵌 6 颗颅灯 = 法力条；熔岩顺中缝流下）
  function gate() {
    part();
    for (let y = -39; y <= -10; y++) for (let x = -13; x <= 13; x++) if (inArch(x, y)) S(x, y, M_ROCK, 0);
    RUN(-30, -16, -10, M_ROCK, 0); RUN(-30, 10, 16, M_ROCK, 0); RUN(-29, -15, -12, M_ROCK, 0); RUN(-29, 12, 15, M_ROCK, 0);   // 挑檐（兽首座）
    RUN(-30, -16, -11, M_ROCK, 4); RUN(-30, 11, 15, M_ROCK, 4);
    RUN(-10, -14, -7, M_ROCK, 0); RUN(-10, 7, 14, M_ROCK, 0);                                                                  // 柱脚
    for (const y of [-17, -23]) { RUN(y, -12, -9, M_ROCK, 2); RUN(y, 9, 12, M_ROCK, 2); }
    for (const a of [-1.15, -0.55, 0.0, 0.55, 1.15]) for (let r = RI + 0.8; r <= RO - 0.6; r += 0.5) S(RD(Math.sin(a) * r), RD(CY - Math.cos(a) * r), M_ROCK, 2);
    for (let i = 0; i < 6; i++) {                                                           // 颅灯：骨白小颅（眼窝 = 火）+ 头顶一簇火
      const [x, y] = LAMPS[i], on = i < P.mana, lv = on ? P.lv : i === P.lw ? 2 : 1;
      S(x, y, M_BONE, 4); S(x + 1, y, M_BONE, 3); S(x + 2, y, M_BONE, 3);
      S(x, y + 1, M_LAVA, lv); S(x + 1, y + 1, M_BONE, 2); S(x + 2, y + 1, M_LAVA, lv);
      S(x, y + 2, M_BONE, 3); S(x + 2, y + 2, M_BONE, 3);
      if (on || lv >= 2) { S(x + 1, y - 1, M_LAVA, lv >= 4 ? 4 : lv); if (on) { S(x + 1, y - 2, M_LAVA, lv >= 4 ? 3 : 2); if (lv >= 4) S(x, y - 1, M_LAVA, 3); } }
    }
    if (P.crk >= 1) for (const [x, y] of CRACK1) S(x, y, M_LAVA, 2);
    if (P.crk >= 2) for (const [x, y] of CRACK2) S(x, y, M_LAVA, 3);
  }
  // 候选部件：熔岩缝（门洞下沿往下淌到地面；lava 0–3 = 流下的长度）
  const LAVA = [[0, -9], [0, -8], [1, -7], [1, -6], [0, -5], [1, -5]];
  function lava() {
    if (!P.lava) return;
    const n = P.lava === 1 ? 2 : P.lava === 2 ? 4 : 6;
    for (let i = 0; i < n; i++) { const [x, y] = LAVA[i]; S(x, y, M_LAVA, i === 0 ? 4 : P.lava === 3 ? 3 : 2); }
    if (P.lava === 3) { S(-1, -7, M_LAVA, 2); S(2, -5, M_LAVA, 2); }
  }
  // 候选部件：熔血漩涡（门洞里两条旋臂转动，白热芯；open 决定大小，2 = 填满门洞）
  function rift() {
    part();
    if (P.open < 0) { S(0, RIFT_Y, M_CORE, 4); S(-1, RIFT_Y, M_RIFT, 3); S(1, RIFT_Y, M_RIFT, 3); S(0, RIFT_Y - 1, M_RIFT, 3); S(0, RIFT_Y + 1, M_RIFT, 3); return; }
    const full = P.open === 2, rx = [1.6, 3.6, 7.5, 5][P.open], ry = [4, 8, 13, 10][P.open], cy = full ? -21.5 : RIFT_Y;
    for (let y = -34; y <= -10; y++) for (let x = -7; x <= 7; x++) {
      if (!inHole(x, y)) continue;
      const u = x / rx, v = (y - cy) / ry, r = Math.hypot(u, v); if (!full && r > 1) continue;
      const rr = Math.min(1, r); let w = (Math.atan2(v, u) / 6.2832 * 2 + rr * 1.4 + P.sw / 8) % 1; if (w < 0) w += 1;
      if (rr < 0.22) S(x, y, M_CORE, rr < 0.11 || full ? 4 : 3);
      else if (rr < 0.34) S(x, y, M_CORE, 2);
      else if (!full && rr > 0.84) S(x, y, M_RIFT, 1);
      else S(x, y, M_RIFT, w < 0.3 ? 4 : w < 0.6 ? 3 : full ? 3 : 2);
    }
  }
  // 候选部件：拱心石（凸出拱顶的尖石，嵌一枚血符）
  function keystone() {
    part(); for (let y = -40; y <= -37; y++) RUN(y, y === -40 ? 0 : -1, y === -40 ? 0 : 1, M_ROCK1, 0); RUN(-37, -2, 2, M_ROCK1, 0);
    S(0, -38, M_LAVA, P.eye === 0 ? 1 : P.eye === 2 || P.mana >= 6 ? 4 : 3);
  }
  // 候选部件：骷髅兽首 + 外弯巨角（ASCII：b 骨 · E 眼火 · k 眼窝 · t 牙 · h 角；mir 1 = 朝左）
  const LEO = ['.........h', '........hh', '.......hh.', '..hhhhhh..', '.bbbbbb...', 'bbkEbbbb..', 'bbbbbbbbb.', '.bbbbtbt..', '..bb..t.t.'];   // 魔豹颅：圆颅、短吻、下垂长獠牙
  const DOG = ['..........h', '.........hh', '........hh.', '...hhhhhh..', '.bbbbb.....', 'bbkEbbbbb..', 'bbbbbbbbbb.', '.bttttttb..', '.bbbb......'];   // 邪犬颅：长吻、一排牙
  function skull(map, x0, yBot, mir) {
    const eyeT = P.eye === 0 ? 1 : P.eye === 2 ? 4 : 3;
    for (const pass of ['h', 'b']) {                                                        // 角先画（根部压在颅骨下），颅骨后画
      part();
      for (let r = 0; r < map.length; r++) { const y = yBot - (map.length - 1 - r), row = map[r]; for (let i = 0; i < row.length; i++) {
        const c = row[i]; if (c === '.' || (pass === 'h') !== (c === 'h')) continue; const x = mir ? x0 - i : x0 + i;
        if (c === 'h') S(x, y, M_HORN, 0); else if (c === 'E') S(x, y, M_LAVA, eyeT); else if (c === 'k') S(x, y, M_BONE, 1); else S(x, y, M_BONE, c === 't' ? 4 : 0);
      } }
    }
  }
  // 候选部件：粗锁链（横环 2 格亮暗 + 竖环 1 格逐行交替；垂到地面沿地面往外堆；brk = 崩断后只剩挂点下 3 节）
  function chainLink(x, y, k, m) { if (k & 1) { S(x, y, m, 4); S(x + 1, y, m, 2); } else S(x, y, m, 3); }
  function chains(inner) {
    for (let c = inner ? 2 : 0; c < (inner ? 4 : 2); c++) {
      const broken = BRK_ORDER.indexOf(c) < P.brk, sg = c & 1 ? 1 : -1;
      part();
      if (!inner) {                                                                         // 外侧：从挑檐外端垂到地面，沿地面往外堆开
        const x0 = sg * 15 - (sg < 0 ? 1 : 0), yEnd = broken ? -26 : -1 - P.yb;
        for (let y = -29; y <= yEnd; y++) chainLink(x0 + (y > -12 ? P.cs : 0), y, y + 29, M_IRON);
        if (broken) { S(x0, -25, M_IRON, 2); }
        const pile = broken ? 5 : 3;                                                        // 地上的链堆（崩断后多堆一截）
        for (let k = 0; k < pile; k++) { const x = x0 + sg * (k + 1); S(x - XO, -YO, M_IRON_D, k & 1 ? 2 : 3); if (k < pile - 2) S(x - XO, -1 - YO, M_IRON_D, k & 1 ? 3 : 4); }
      } else {                                                                              // 门洞内沿：斜缠过拱肩，再沿门柱内沿垂下，末端一只张开的镣铐
        const x = sg < 0 ? -8 : 7;
        for (let k = 0; k <= 4; k += 2) { const xx = x + sg * (4 - k) - (sg < 0 ? 0 : 0), y = -32 + k; S(xx, y, M_IRON, 4); S(xx + 1, y + 1, M_IRON, 2); }
        const yEnd = broken ? -25 : -14;
        for (let y = -27; y <= yEnd; y++) chainLink(x + (y > -20 && !broken ? P.cs : 0), y, y, M_IRON);
        if (!broken) { const cx = x + P.cs; S(cx - 1, -13, M_IRON, 4); S(cx + 1, -13, M_IRON, 3); S(cx - 1, -12, M_IRON, 2); S(cx + 1, -12, M_IRON, 2); }
      }
    }
  }
  // 候选部件：火爪影（门里伸出的魔爪：手臂 + 三根弯爪；1 扒门框 · 2 缩在门里 · 3 伸出 · 4 收回中）
  function claw() {
    if (!P.claw) return;
    part();
    if (P.claw === 1) {                                                                     // 三根爪尖扒住门洞右沿
      for (const y of [-24, -21, -18]) { S(5, y, M_CLAW, 3); S(6, y, M_CLAW, 4); S(7, y, M_CLAW, 4); S(8, y + 1, M_CLAW, 3); }
      S(4, -23, M_CLAW, 2); S(4, -20, M_CLAW, 2); S(3, -21, M_CLAW, 2); return;
    }
    const reach = P.claw === 2 ? 3 : P.claw === 3 ? 20 : 12, y0 = P.claw === 3 ? -19 : -21;
    for (let x = -1; x <= reach - 3; x++) { const y = y0 + (x > reach - 8 ? 1 : 0); S(x, y, M_CLAW, x & 1 ? 3 : 2); S(x, y + 1, M_CLAW, 2); if (x < 4) S(x, y - 1, M_CLAW, 2); }
    const hx = reach - 2, hy = y0 + 1;                                                      // 爪掌 + 三根向下弯的爪
    S(hx, hy - 1, M_CLAW, 3); S(hx, hy, M_CLAW, 3); S(hx, hy + 1, M_CLAW, 3); S(hx + 1, hy, M_CLAW, 4);
    for (const dy of [-2, 0, 2]) { S(hx + 2, hy + dy, M_CLAW, 4); S(hx + 3, hy + dy + 1, M_CLAW, 4); if (P.claw === 3) S(hx + 3, hy + dy + 2, M_CLAW, 3); }
  }
  function drawHero() {
    begin(hero, 0, 0); XO = P.bx; YO = P.yb;
    feet(1); if (!P.imp) chains(false); base(); feet(0); gate(); lava(); rift(); keystone();
    skull(LEO, -9, -31, 1); skull(DOG, 8, -31, 0);
    if (!P.imp) chains(true); claw();
  }
  // 内爆：烘焙后把像素按螺旋收向门心（外圈先走、越往里转得越快），并按抖动阈值逐步删掉
  const TMP_O = new Uint8Array(hero.w * hero.h), TMP_M = new Uint8Array(hero.w * hero.h);
  function implode(q) {
    const w = hero.w, h = hero.h, cx = hero.ox + P.bx, cy = hero.oy + RIFT_Y + P.yb;
    TMP_O.set(hero.out); TMP_M.set(hero.mat); hero.out.fill(255); hero.mat.fill(0);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (TMP_O[i] === 255) continue;
      const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy), rn = Math.min(1, r / 24);
      if (B8[(y & 7) * 8 + (x & 7)] * 0.6 + (1 - rn) * 0.4 < q * 1.05 - 0.05 && q > 0.1) continue;   // 外圈先被吸走
      const k = Math.pow(1 - q, 1.4), a = Math.atan2(dy, dx) + q * (0.5 + 4.5 * (1 - rn) * (1 - rn));
      const X = RD(cx + Math.cos(a) * r * k), Y = RD(cy + Math.sin(a) * r * k);
      if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; hero.out[j] = TMP_O[i]; hero.mat[j] = TMP_M[i];
    }
  }
  function bakeHero() {
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
    if (P.imp > 0) implode(P.imp / 12);
  }

  // ───── 召唤物剪影（施放时扑出门洞；只当形状用，blitShape 单色）─────
  const M_SIL = defMat('stone', 1);
  const SIL = { leo: [new Sprite(24, 14, 12, 13), new Sprite(24, 14, 12, 13)], dog: [new Sprite(22, 16, 11, 15), new Sprite(22, 16, 11, 15)] };
  const sil = (x, y) => sp(x, y, M_SIL, 0), silRun = (y, x0, x1) => { for (let x = x0; x <= x1; x++) sil(x, y); };
  function buildSil() {
    for (let f = 0; f < 2; f++) {
      begin(SIL.leo[f], 0, 0); part();                                                     // 魔豹：弓背修长、肩上两条触须、分叉双尾
      silRun(-6, -4, 4); silRun(-5, -5, 5); silRun(-7, -2, 2); silRun(-4, -4, 4);
      silRun(-8, 5, 8); silRun(-7, 5, 9); silRun(-6, 6, 9); sil(6, -9); sil(8, -9);
      for (const [x, y] of [[1, -8], [0, -9], [-1, -10], [-2, -11], [2, -9], [2, -10], [3, -11], [4, -12]]) sil(x, y);   // 触须
      for (const [x, y] of [[-5, -6], [-6, -7], [-7, -8], [-8, -8], [-9, -9], [-6, -5], [-7, -5], [-8, -4], [-9, -4], [-10, -5]]) sil(x, y);   // 双尾
      const L = f ? [[3, -3], [3, -2], [4, -1], [4, 0], [-3, -3], [-2, -2], [-2, -1], [-1, 0]] : [[4, -3], [5, -2], [6, -1], [7, 0], [-3, -3], [-4, -2], [-5, -1], [-6, 0]];
      for (const [x, y] of L) sil(x, y);
      bake(SIL.leo[f], { rim: 0, flash: 0, dq: 0 });
      begin(SIL.dog[f], 0, 0); part();                                                     // 邪犬：骨瘦长腿、前弯短角、长吻、拖断链
      silRun(-8, -4, 3); silRun(-7, -4, 4); silRun(-6, -3, 1);
      silRun(-10, 3, 6); silRun(-9, 3, 8); sil(8, -8); sil(4, -11); sil(5, -12); sil(6, -12);
      for (const [x, y] of [[-5, -9], [-6, -10], [-7, -11]]) sil(x, y);
      for (const [x, y] of [[-2, -5], [-3, -4], [-5, -4], [-6, -3], [-8, -3]]) sil(x, y);    // 拖着的断链
      const D = f ? [[2, -5], [2, -4], [2, -3], [3, -2], [3, -1], [3, 0], [-2, -5], [-3, -3], [-3, -2], [-2, -1], [-2, 0]]
        : [[3, -5], [4, -4], [5, -3], [6, -2], [7, -1], [7, 0], [-3, -5], [-4, -4], [-5, -3], [-6, -2], [-7, -1], [-7, 0]];
      for (const [x, y] of D) sil(x, y);
      bake(SIL.dog[f], { rim: 0, flash: 0, dq: 0 });
    }
  }
  buildSil();

  // ───── 特效 ─────
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  // 崩落的岩块（每断一根锁链掉一块）：小池子，落地弹一下后平躺、抖动消散
  const DBN = 6, dbOn = new Uint8Array(DBN), dbX = new Float32Array(DBN), dbY = new Float32Array(DBN), dbVX = new Float32Array(DBN), dbVY = new Float32Array(DBN), dbAge = new Float32Array(DBN), dbB = new Uint8Array(DBN);
  function drop(x, y, vx, vy) { let i = 0; for (; i < DBN - 1 && dbOn[i]; i++); dbOn[i] = 1; dbX[i] = x; dbY[i] = y; dbVX[i] = vx; dbVY[i] = vy; dbAge[i] = 0; dbB[i] = 0; }
  const SUM = [{ t0: 0.04, dur: 0.24, from: 8, to: 30, kind: 'leo' }, { t0: 0.16, dur: 0.24, from: 6, to: 19, kind: 'dog' }];
  const BRK_AT = [[-15, -25], [15, -25], [-8, -24], [8, -24]];                           // 各锁链崩断的位置（本地坐标）
  let sumT = -1, sumLand = [0, 0], pilT = -1, chargeAcc = 0, dripAcc = 0, riseAcc = 0, mzT = 9, ptT = -1, chT = -1, chX0 = 0, chFlip = 0;
  function onEnter(s) {
    if (s !== CAST) return;
    const cx = wx(0), cy = wy(RIFT_Y);
    releaseOrbit(30, 90, 0.3, 0.6, { pts: 1, up: 6 });
    burst(cx, cy, 30, 40, 120, 0.3, 0.7, R_EL, 10); fx.cross(cx, cy, 7, R_EL, 0.3); ring(cx, cy, 1, R_EL);
    pilT = 0; sumT = 0; sumLand[0] = sumLand[1] = 0;
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_F) {                                                        // 火爪虚抓：甩出三道爪痕
      const x = wx(20), y = wy(-19);
      shoot(1, x, y, 140, DUMMY_X - 3, R_EL, 0, { trail: { every: 2, life: [0.12, 0.25] } });
      burst(x, y, 10, 25, 80, 0.15, 0.35, FXI.fire, 0); fx.slash(x - 2, y, 5, 0.6, 2.4, R_EL, 0.18, 2); mzT = 0;
      sfx('swing', { kind: 'claw', w: 0.7 }); sfx('shoot', { proj: 'fire' });
    }
    if (s === CHARGE) for (let k = 0; k < 4; k++) if (t === T_BRK[k]) {                     // 一根锁链「崩」地绷断：金属火星 + 掉一块岩 + 震屏 1 格
      const [bx, by] = BRK_AT[BRK_ORDER[k]], x = wx(bx), y = wy(by);
      burst(x, y, 10, 30, 90, 0.2, 0.45, FXI.steel, 10); fx.cross(x, y, 3, FXI.steel, 0.15);
      drop(wx(bx * 0.7), wy(-33), (P.flip ? -1 : 1) * bx * 2.2, -35); shake(0.1, 1);
    }
    if (s === DEATH && t === T_FLARE) { burst(wx(0), wy(RIFT_Y), 16, 30, 90, 0.3, 0.6, R_EL, 6); fx.cross(wx(0), wy(RIFT_Y), 5, R_EL, 0.2); }
    if (s === DEATH && t === T_IMP) {                                                       // 锁链脱落，开始被吸进门心
      chT = 0; chX0 = HX + P.mx; chFlip = P.flip; shake(0.2, 1); dim(0.6);
    }
    if (s === DEATH && t === T_CHLAND) { for (const sg of [-1, 1]) burst(chX0 + sg * 16, HY - 1, 6, 10, 35, 0.3, 0.6, FXI.dust, 8); sfx('fall', { w: 0.6 }); }
    if (s === DEATH && t === T_IMPEND) {                                                    // 最后一点闪白熄灭
      ptT = 0; flash(0.04); shake(0.14, 2); ring(wx(0), wy(RIFT_Y + 1), 0, R_EL);
      burst(wx(0), wy(RIFT_Y + 1), 14, 20, 70, 0.3, 0.7, R_EL, 4);
    }
  }
  const dim = E.dim || (() => {});
  const EVENTS = [[], [], [T_F], T_BRK.slice(), [], [], [], [T_FLARE, T_IMP, T_CHLAND, T_IMPEND], []];
  function impactOn(k, x, y) { if (k === 1) { burst(x, y, 14, 30, 90, 0.2, 0.5, R_EL, 8); fx.slash(x - 2, y, 5, 0.5, 2.6, R_EL, 0.2, 1); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.6 }); } }
  function hurtFx(s) {                                                                      // 黑曜岩受击：火花 + 岩屑 + 震出的熔血
    const hx = wx(1), hy = HY - 21; burst(hx, hy, s === DEATH ? 26 : 18, 50, 150, 0.25, 0.55, FXI.impact, 20); burst(hx, hy, s === DEATH ? 12 : 6, 30, 80, 0.3, 0.6, FXI.dust, 12);
    burst(wx(0), wy(RIFT_Y), 6, 15, 50, 0.3, 0.6, R_EL, 10); shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function landSummon(j) {                                                                  // 剪影落地：地裂（双向）+ 火环 + 熔岩飞溅
    const x = HX + SUM[j].to * (P.flip ? -1 : 1);
    fx.crack(x, HY, 8, 1, R_EL, 0.9); fx.crack(x, HY, 8, -1, R_EL, 0.9);
    ring(x, HY - 3, j ? 0 : 1, FXI.fire); burst(x, HY - 4, 16, 30, 100, 0.3, 0.7, R_EL, 18); fx.cross(x, HY - 6, 4, R_EL, 0.25);
    for (let i = 0; i < 10; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 6, HY - 3, (Math.random() - 0.5) * 70, -40 - Math.random() * 50, 0.6 + Math.random() * 0.4, FXI.fire, { g: 260, floor: HY });
    shake(0.12, 1); sfx('impact', { pal: 'blood', w: j ? 1.0 : 0.85 });
  }
  function stepFX(dt, state, t) {
    if (state === CHARGE) {                                                                 // 熔血螺旋汇进裂隙
      chargeAcc += dt * (16 + 26 * clamp01(t / 1.2));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 12 + Math.random() * 12; spawn(K_SPIRAL_PT, wx(0), wy(RIFT_Y + P.yb), r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if (state === IDLE || state === RECOVER || state === CHARGE) {                          // 熔岩从门缝一滴滴落下 + 颅灯火星
      dripAcc += dt * (state === IDLE ? 2.5 : 6);
      while (dripAcc >= 1) {
        dripAcc -= 1; spawnX(K_PHYS, wx(RD(Math.random() * 2)), wy(-6 + P.yb), 0, 5, 0.5, FXI.fire, { g: 120, floor: HY });
        const L = LAMPS[(Math.random() * 6) | 0]; if (state !== IDLE || Math.random() < 0.5) spawn(K_EMBER, wx(L[0] + 1), wy(L[1] - 2 + P.yb), Math.random() * 6 - 3, -8 - Math.random() * 6, 0.4 + Math.random() * 0.3, FXI.fire);
      }
    }
    if (state === MOVE) {                                                                   // 蹒跚：每个接触帧 3 颗尘 + 顿挫
      const f = gait(q12(t)), fPrev = gait(q12(Math.max(0, t - dt)));
      if ((f === 0 || f === 2) && (f !== fPrev || t < dt * 1.5)) {
        for (let i = 0; i < 3; i++) spawn(K_DUST, wx(RD(Math.random() * 26 - 13)), HY - 1, (Math.random() - 0.5) * 24, -5 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust);
        sfx('step', { w: 1.0 });
      }
    }
    if (state === DEATH && chT >= 0 && t < T_IMPEND) {                                      // 内爆：碎屑被螺旋吸进门心
      chargeAcc += dt * 40;
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 8 + Math.random() * 14; spawn(K_SPIRAL_PT, chX0, wy(RIFT_Y + 1), r / (0.25 + Math.random() * 0.2), 0, 9, R_EL, a, r, 7 + Math.random() * 3); }
    }
    if (state === DEATH && t > T_IMPEND && t < INCOMING + 2.3) { riseAcc += dt * 10; while (riseAcc >= 1) { riseAcc -= 1; spawn(K_RISE, chX0 - 8 + Math.random() * 16, HY - 2 - Math.random() * 6, (Math.random() - 0.5) * 6, -12 - Math.random() * 12, 0.8 + Math.random() * 0.6, FXI.soul); } }
    if (sumT >= 0) { sumT += dt; for (let j = 0; j < 2; j++) if (!sumLand[j] && sumT >= SUM[j].t0 + SUM[j].dur) { sumLand[j] = 1; landSummon(j); } if (sumT > 1.3) sumT = -1; }
    if (pilT >= 0) { pilT += dt; if (pilT > 0.6) pilT = -1; }
    for (let i = 0; i < DBN; i++) {
      if (!dbOn[i]) continue; dbAge[i] += dt;
      if (dbB[i] < 2) { dbVY[i] += 300 * dt; dbX[i] += dbVX[i] * dt; dbY[i] += dbVY[i] * dt; }
      if (dbB[i] < 2 && dbY[i] >= HY - 1 && dbVY[i] > 0) {
        dbY[i] = HY - 1; if (dbB[i] === 0) burst(dbX[i], HY - 1, 5, 10, 35, 0.2, 0.4, FXI.dust, 8);
        dbB[i]++; dbVY[i] *= -0.3; dbVX[i] *= 0.4; if (dbB[i] >= 2) { dbVY[i] = 0; dbVX[i] = 0; }
      }
      if (dbAge[i] > 2.4) dbOn[i] = 0;
    }
    mzT += dt; if (ptT >= 0) ptT += dt; if (chT >= 0) chT += dt;
  }
  function fxReset() { dbOn.fill(0); sumT = -1; sumLand[0] = sumLand[1] = 0; pilT = -1; chargeAcc = 0; dripAcc = 0; riseAcc = 0; mzT = 9; ptT = -1; chT = -1; }
  function fxBack(f12) {
    if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12);
    if (P.dq < 1 && P.lava === 3) for (let x = -3; x <= 4; x++) if (((x + f12) & 1) === 0) put(wx(x), HY + 1, FIRE[2]);   // 熔岩淌到地面的一小滩映光
    shotFloorGlow(f12);
  }
  function drawShot(k, x, y, d, f12, Rr) {                                                  // 三道弯爪痕，一起往前飞
    if (k !== 1) return false;
    for (const dy of [-3, 0, 3]) { put(x + d, y + dy - 1, 21); put(x, y + dy, 58); put(x - d, y + dy + 1, 57); put(x - 2 * d, y + dy + 1, (f12 & 1) ? 56 : 57); }
    return true;
  }
  // 地上的锁链（内爆时脱落）：4 根链从挂着的位置竖直掉下，落到地面沿地面往外堆开，最后抖动消散
  function fallenChains() {
    if (chT < 0) return;
    const fade = clamp01((chT - 1.5) / 0.5), drop = Math.min(40, 0.5 * 320 * chT * chT), sg0 = chFlip ? -1 : 1;
    for (const [lx, top, len] of [[-16, -29, 28], [15, -29, 28], [-8, -27, 14], [7, -27, 14]]) {
      const sgn = lx < 0 ? -1 : 1; let pile = 0;
      for (let k = 0; k < len; k++) {
        let x = chX0 + sg0 * lx, y = HY + top + k + drop;
        if (y >= HY) { pile++; x += sg0 * sgn * Math.ceil(pile / 2); y = HY - ((pile & 1) ? 0 : 1); if (pile > 12) continue; }
        if (fade > 0 && B8[((y + 64) & 7) * 8 + ((x + 64) & 7)] < fade) continue;
        put(x, y, k & 1 ? 29 : 28); if ((k & 1) && y < HY) put(x + 1, y, 27);
      }
    }
  }
  function fxFront(f12) {
    for (let i = 0; i < DBN; i++) {                                                         // 崩落的黑曜岩块（2×2）
      if (!dbOn[i]) continue; const x = RD(dbX[i]), y = RD(dbY[i]), fade = clamp01((dbAge[i] - 1.8) / 0.5);
      if (fade > 0 && B8[((y + 64) & 7) * 8 + ((x + 64) & 7)] < fade) continue;
      put(x, y - 1, OBS[3]); put(x + 1, y - 1, OBS[2]); put(x, y, OBS[2]); put(x + 1, y, OBS[1]); if (i & 1) put(x + 2, y, OBS[1]);
    }
    fallenChains();
    if (pilT >= 0) {                                                                        // 血红火柱：从门洞自下而上冲天，再从下往上断开
      const q = pilT / 0.6, x = wx(0), yb = wy(RIFT_Y - 6), top = Math.round(yb - (yb + 2) * Math.min(1, q / 0.15)), cut = q < 0.35 ? yb : Math.round(yb - (yb - top) * (q - 0.35) / 0.65);
      const w = q < 0.3 ? 3 : 2, late = q > 0.55;
      for (let y = top; y <= cut; y++) for (let dx = -w; dx <= w; dx++) {
        const e = Math.abs(dx) / w; if (late && e > 0.5 && ((dx + y + f12) & 1)) continue;
        put(x + dx, y, q < 0.1 ? 21 : e < 0.4 ? (q < 0.45 ? EL[0] : EL[1]) : e < 0.8 ? EL[1] : EL[2]);
      }
      if (q < 0.5) for (let dx = -w - 2; dx <= w + 2; dx++) if ((dx + f12) & 1) put(x + dx, top, EL[1]);
    }
    if (sumT >= 0) {                                                                        // 魔豹、邪犬剪影扑出门洞
      const sg = P.flip ? -1 : 1;
      for (let j = 0; j < 2; j++) {
        const s = SUM[j], q = (sumT - s.t0) / s.dur; if (q < 0) continue;
        const hold = sumT - s.t0 - s.dur, dq = clamp01((hold - 0.35) / 0.35); if (dq >= 1) continue;
        const qq = ease.out(clamp01(q)), x = RD(HX + sg * (s.from + (s.to - s.from) * qq)), air = q < 1 ? RD(Math.sin(clamp01(q) * Math.PI) * 5) : 0;
        const legs = q < 1 ? (Math.floor(sumT * 12 + 1e-6) & 1) : 0, spr = SIL[s.kind][legs];
        if (q < 1) { blitShape(spr, x - sg * 5, HY - air, P.flip, EL[3], 0.5); blitShape(spr, x - sg * 2, HY - air, P.flip, EL[2], 0.25); }
        blitShape(spr, x, HY - air, P.flip, q < 0.5 ? EL[0] : hold < 0.2 ? EL[1] : EL[2], dq);
        if (dq < 0.5) { const ex = x + sg * (s.kind === 'leo' ? 8 : 7), ey = HY - air - (s.kind === 'leo' ? 8 : 10); put(ex, ey, 21); }
      }
    }
    if (mzT < 2 / 12 && P.dq < 1) {                                                         // 爪尖出手的火光（2 帧）
      const x = wx(21), y = wy(-19), c = mzT < 1 / 12 ? 21 : EL[1];
      for (let r = 1; r <= 3; r++) { put(x + r, y, r < 3 ? c : EL[2]); put(x, y - r, r < 2 ? c : EL[2]); put(x, y + r, r < 2 ? c : EL[2]); } put(x, y, 21);
    }
    if (ptT >= 0 && ptT < 0.45) {                                                           // 门心最后一点：闪白 → 熄灭
      const x = chX0, y = wy(RIFT_Y + 1), c = ptT < 0.12 ? 21 : ptT < 0.28 ? EL[1] : EL[3];
      put(x, y, c); if (ptT < 0.2) for (let r = 1; r <= (ptT < 0.1 ? 4 : 2); r++) { put(x - r, y, EL[1]); put(x + r, y, EL[1]); put(x, y - r, EL[1]); put(x, y + r, EL[1]); }
    }
  }

  return {
    name: '地狱召唤塔', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_RIFT, M_CORE, M_LAVA, M_CLAW], HIT_POINT: [1, -21], EVENTS,
    deathKit: { mode: 'implode', at: T_IMP },
    SFX: { body: 'stone', how: 'dissolve', pal: 'blood', style: 'summon', w: 1.0 },
    REVIVE: { dy: -20, ramp: R_EL, big: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot, hurtFx,
  };
});
