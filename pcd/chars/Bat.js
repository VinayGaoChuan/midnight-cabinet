// 机枪蝠（部队 · 科技 · 射手 · 优质 · 远程 640）：圆鼓鼓的铆钉铁皮蝙蝠扑翼机——一对帆布膜翼 + 3 根黄铜翼骨、两只尖耳换成钢支杆顶着的两面会转的苍白钢碟形雷达、
// 腹下两根吊杆挂一只小圆吊舱，舱里戴皮帽的机枪手端着一挺往前伸的转管机枪（枪口是发光体）。
// 攻击 = 机枪手压枪点射 3 发曳光小弹，吊舱后坐晃一下；技能 = 特性「机枪手」（每 0.5 秒扫射一个敌人）：拉枪栓、枪管转到残影、雷达一齐对准目标
// → 0.5 秒连射 12 发曳光弹、弹壳哗哗往下掉 → 目标身上一串银白火花、地上从近到远一排扬尘 → 枪管减速冒一缕烟。
// 死亡 = 散架：翼骨铰链崩开，两片翅膀先后飘落，铁皮身体直线坠地摔成几块，机枪手跳出吊舱撑开小降落伞慢慢落下，然后一起消散。
// 会升级成「吸血蝠」（VampireBat.js）：保留铆钉膜翼、雷达耳、腹下吊舱（吊舱换成弹舱、机枪手换成指挥官）。
// 身体用 parts-beast 的 B.fly（蝠头、膜翼、身体）；雷达耳、吊舱、机枪手、转管机枪、降落伞是本模块自画的部件（候选部件见各函数前的注释）。
PCD.define('Bat', (E) => {
  const { defMat, Sprite, begin, part, sp, bake, ease, clamp01, q12, f12of, walkDemo, keyer, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_TRAIL, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, groundShadow, sfx } = E;
  const B = E.parts.beast, F = B.fly, U = B.util, R = Math.round;

  // ───── 材质 ─────
  // 身体 枪铁灰铁皮（iron，身体 band 2）；翼膜 旧帆布（暖灰低明度：石 9 → 暖灰 7 → 奶油 6，冷暖和黄铜翼骨拉开、明度低两档，翼骨才读得成亮线）；
  // 翼骨 / 吊舱镶边 黄铜（gold）；雷达碟 苍白钢（pale，碟沿亮、和黄铜翼骨分开）+ 钢支杆；机枪 steel；机枪手皮帽 boot
  const m = B.mats(E, { main: 'iron', head: 'steel', belly: [0, 28, 29, 30], wing: [8, 9, 7, 6], bone: 'gold', claw: 'gold', eye: [0, 0, 47, 47], nose: 'steel' });
  m.boneFar = defMat([20, 20, 19, 14], 1);                                   // 远翼翼骨：暗黄铜（远翼整体压暗一级，近翼的 3 根亮骨才不和它挤成一片金）
  const o = F.shape({ alt: 12, rx: 5, ry: 3.5, head: 'bat', hr: 3, earH: 0, tail: 'none', wing: { span: 16, chord: 6, type: 'membrane', fingers: 3 }, legLen: 0, talon: 0, m });
  const M_GOLD = defMat('gold', 1), M_GOLDF = defMat('gold', 1, 0, 1), M_POD = defMat('iron', 1), M_GUN = defMat('steel', 1), M_SKIN = defMat('skin', 1), M_CAP = defMat('boot', 1),
    M_COAT = defMat('leather', 1), M_INK = defMat('ink', 1, 1), M_CORE = defMat([28, 30, 31, 21], 1, 1), M_MZ = defMat([28, 30, 31, 21], 1, 1), M_RAG = defMat('white', 1),
    M_CHUTE = defMat('pale', 1), M_STRIPE = defMat('crimson', 1), M_LINE = defMat([27, 28, 28, 29], 1, 1),
    M_DISH = defMat('pale', 1), M_DISHF = defMat('pale', 1, 0, 1), M_MAST = defMat('steel', 1);
  const R_EL = FXI.steel, EL = FXR[R_EL], HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(84, 60, 42, 52);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of [M_MZ, M_CORE, M_SKIN, M_INK, M_RAG, m.eye, m.ink]) RIM.skip[k] = 1;

  // ───── 姿势 ─────
  // 骨架字段（B.fly）：gf 扑翼帧 · wing 翼姿 · bob · lift（坠落时 = 离地高）· pitch · lie · eyes
  // 本角色：pod 吊舱横摆 · pdy 吊舱纵向滞后 · rad 雷达朝向 0 前 / 1 正对镜头 / 2 后 · eg 雷达耳心亮 0–2 · spin 枪管相位 0–2、3 = 残影 · gem 枪口亮度 0–4
  //         duck 机枪手缩头 · rag 擦枪抹布位置 0–3 · bolt 拉枪栓 · dst 死亡阶段 0 完整 / 1 散架坠落 / 2 残骸 · wnx wny wnp / wfx wfy wfp 脱落的近 / 远翼（根部位置、翼姿）
  //         gux guy chute 跳伞的机枪手（脚底位置、伞 0 无 / 1 打开中 / 2 张开 / 3 落地塌下）
  const P = {}; F.reset(P);
  Object.assign(P, { pod: 0, pdy: 0, rad: 0, eg: 0, spin: 0, gem: 0, duck: 0, rag: 0, bolt: 0, dst: 0, wnx: 0, wny: 0, wnp: 0, wfx: 0, wfy: 0, wfp: 0, gux: 0, guy: 0, chute: 0, st: 0, gx: 0, gy: 0, k1: 0, k2: 0, dq48: 0 });
  const KEY = keyer([['gf', -1, 3], ['wing', 0, 6], ['bob', -2, 2], ['lift', 0, 15], ['pitch', -2, 3], ['lie', 0, 2], ['eyes', 0, 1], ['flash', 0, 1], ['bx', -8, 8], ['dq48', 0, 48],
    ['rim', 0, 3], ['pod', -2, 2], ['pdy', -1, 1], ['rad', 0, 2], ['eg', 0, 2], ['spin', 0, 3], ['gem', 0, 4], ['duck', 0, 1], ['rag', 0, 3], ['bolt', 0, 1],
    ['dst', 0, 2], ['wnx', -24, 24], ['wny', -31, 0], ['wnp', 0, 6], ['wfx', -24, 24], ['wfy', -31, 0], ['wfp', 0, 6], ['gux', -24, 24], ['guy', -31, 0], ['chute', 0, 3]]);
  const POD_IDLE = [0, 1, 0, -1], POD_MOVE = [0, -1, -1, 0], PDY_MOVE = [0, 1, 0, -1];
  const T_S = [2 / 12, 3 / 12, 4 / 12];                                    // 点射 3 发
  const SK_T = []; for (let k = 1; k < 12; k++) SK_T.push(k * 0.04);         // 技能：12 发（第 1 发在进入施放时）
  const T_POP = INCOMING + 0.25, T_CRASH = INCOMING + 0.7, T_WN = INCOMING + 1.1, T_WF = INCOMING + 1.35, T_GL = INCOMING + 1.5;
  let rig = null;

  function reset() {
    F.reset(P); P.pod = 0; P.pdy = 0; P.rad = 0; P.eg = 0; P.spin = 0; P.gem = 0; P.duck = 0; P.rag = 0; P.bolt = 0; P.dst = 0;
    P.wnx = 0; P.wny = 0; P.wnp = 0; P.wfx = 0; P.wfy = 0; P.wfp = 0; P.gux = 0; P.guy = 0; P.chute = 0; P.rim = 1;
  }
  function idle(tq, f12) {
    const lp = F.anim.idle(P, tq, f12, DUR[IDLE]); P.pod = POD_IDLE[(P.gf + 1) & 3] > 0 ? 1 : 0; P.pdy = P.gf === 1 ? 1 : 0;
    P.rad = lp < 0.8 ? 0 : lp < 1.2 ? 1 : lp < 1.6 ? 2 : lp < 2.0 ? 0 : 1;              // 雷达耳左右转着张望
    if (lp >= 1.6 && lp < 2.0) { P.rag = 1 + (f12of(lp - 1.6) % 3); P.spin = f12of(lp) % 3; }   // 待机个性：机枪手拿抹布擦枪管（枪管跟着转）
  }
  const podAt = () => { const C = rig.C; return [R(C.x + 2) + P.pod, R(C.y + 8.5) + P.pdy]; };

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), f = f12of(t); reset(); P.st = st;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                 // 扑翼前飞：身体前倾起伏 2 格，吊舱滞后半拍摆
      const g = F.anim.walk(P, tq); P.legs = 0; P.pod = POD_MOVE[g]; P.pdy = PDY_MOVE[g]; P.rad = 0;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                             // 预兆：雷达对准、枪管起转 → 3 发点射（吊舱后坐）→ 回位
      F.anim.idle(P, tq, f12, DUR[IDLE]); P.rad = 0;
      if (f < 2) { P.eg = 1; P.gem = 1; P.spin = f; P.pitch = -1; }
      else if (f <= 4) { P.eg = 1; P.gem = f === 3 ? 2 : 3; P.spin = f % 3; P.pod = f === 3 ? 0 : -1; P.rim = 2; }
      else if (tq < 0.45) { P.gem = 1; P.spin = f % 3; }
      else P.spin = f12of(tq * 0.5) % 3;
    } else if (st === CHARGE) {                                             // 拉枪栓、枪管加速到残影、雷达一齐对准目标、耳心亮
      F.anim.idle(P, tq, f12, DUR[IDLE]); const q = ease.inOut(clamp01(tq / 0.7));
      P.lift = R(2 * q); P.rad = 0; P.bolt = tq >= 0.1 && tq < 0.4 ? 1 : 0;
      P.spin = tq < 0.6 ? Math.floor(f / 3) % 3 : tq < 1.05 ? f % 3 : 3;
      P.eg = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
      if (tq >= 0.9) { P.gf = -1; P.wing = 2; P.bob = 0; P.pod = 1; }       // 最后 0.5 秒：翅膀展平定住、吊舱往前顶 1 格（姿势本身读出「要开火了」）
      if (tq > 1.1) P.pdy = (f12 & 1) ? 1 : 0;                              // 蓄满：吊舱跟着枪抖
    } else if (st === CAST) {                                               // 0.5 秒持续扫射：枪口每帧闪、吊舱每帧后坐
      P.gf = f12 & 3; P.bob = B.FLAP_BOB[P.gf]; P.lift = 2; P.rad = 0; P.eg = 2; P.spin = 3; P.gem = (f & 1) ? 2 : 3; P.pod = (f & 1) ? 0 : -1; P.rim = 3;
    } else if (st === RECOVER) {                                            // 枪管减速停下
      F.anim.idle(P, tq, f12, DUR[IDLE]); const q = ease.inOut(clamp01(tq / 0.6));
      P.lift = R(2 * (1 - q)); P.spin = tq < 0.25 ? f % 3 : tq < 0.5 ? Math.floor(f / 3) % 3 : 0;
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.eg = q < 0.5 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { F.anim.hurt(P, h); P.duck = 1; P.pod = 1; P.pdy = -1; P.rad = 2; P.rim = 0; }
      else if (h < 0.35) { F.anim.hurt(P, h); P.duck = 1; P.pod = 1; P.rad = 1; P.rim = 0; }
      else idle(tq, f12);
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(tq, f12); P.rim = 1; }
      else if (d < T_POP - INCOMING) { F.anim.hurt(P, Math.min(d, 0.19)); P.duck = 1; P.pod = 1; P.rad = 2; P.gem = (f12 & 1) ? 1 : 4; }
      else {
        P.dst = tq < T_CRASH ? 1 : 2; P.eyes = 1; P.gem = 4; P.bx = -2;
        if (P.dst === 1) { const q = clamp01((d - 0.25) / 0.45); P.lie = 1; P.lift = R(12 * (1 - ease.in(q))); P.pitch = 1; P.pod = (f12 & 1) ? 1 : 0; P.rad = 2; }
        else P.lie = 2;
        // 两片翅膀先后飘落（近翼先落，远翼晚一点、往后飘得远）
        const qn = clamp01((d - 0.25) / (T_WN - T_POP)), qf = clamp01((d - 0.25) / (T_WF - T_POP));
        P.wnx = R(1 + 8 * qn + (qn < 1 ? Math.sin(qn * 11) * 1.5 : 0)); P.wny = R(-18 + 16 * qn); P.wnp = qn < 1 ? [2, 4, 6, 4][(f12 >> 1) & 3] : 2;
        P.wfx = R(3 - 12 * qf + (qf < 1 ? Math.sin(qf * 9 + 1) * 1.5 : 0)); P.wfy = R(-20 + 18 * qf); P.wfp = qf < 1 ? [4, 2, 4, 6][(f12 >> 1) & 3] : 2;
        // 机枪手跳出吊舱 → 伞打开 → 慢慢落下
        if (d < 0.4) { const q = (d - 0.25) / 0.15; P.gux = R(1 - 3 * q); P.guy = R(-8 - 8 * Math.sin(q * Math.PI * 0.5)); P.chute = 0; }
        else if (tq < T_GL) { const q = clamp01((d - 0.4) / (T_GL - INCOMING - 0.4)); P.gux = R(-2 - 18 * q + Math.sin(q * 8) * 1.2); P.guy = R(-16 + 16 * q); P.chute = d < 0.48 ? 1 : 2; }
        else { P.gux = -20; P.guy = 0; P.chute = 3; }
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, f12); P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = F.rig(P, o);
    if (P.dst === 0) { const [px, py] = podAt(); P.gx = px + 9 + P.bx; P.gy = py - 1; }
    else { P.gx = R(rig.C.x) + P.bx; P.gy = R(rig.C.y); }
    P.dq48 = R(P.dq * 48); KEY(P);
  }

  // ───── 画 ─────
  // 候选部件：radarEar 碟形雷达耳——钢支杆（从头皮往上至少 2 格，剪影里是两根细杆顶着两只碟）+ 3 格高的苍白钢碟（碟沿亮、和黄铜翼骨分开）；
  //           x 碟中列，支杆在碟背那一列（x - 1），b 碟底行，foot 支杆脚下那一行（头皮）；dir 0 碟口朝前（侧看「(」+ 前伸馈源）· 1 正对镜头（3×3 圆碟）· 2 朝后；
  //           碟心（馈源）= 耳心，lv 0 暗 / 1 银亮 / 2 白亮；mat 碟身材质
  function radarEar(x, b, foot, dir, lv, mat, fx) {
    part(); const h = 3; fx = fx == null ? x - 1 : fx;                                     // fx 支杆脚落在哪一列（≠ x - 1 时斜着伸上去）
    for (let y = b + 1; y <= foot; y++) { const q = foot === b + 1 ? 0 : (y - b - 1) / (foot - b - 1); sp(R(x - 1 + (fx - x + 1) * q), y, M_MAST, y === b + 1 ? 4 : 0); }   // 支杆
    const core = (cx, cy) => { if (lv) sp(cx, cy, M_CORE, lv + 2); else sp(cx, cy, mat, 2); };
    if (dir === 1) { for (let j = 0; j < h; j++) for (let i = -1; i <= 1; i++) sp(x + i, b - j, mat, (i === -1 || j === h - 1) ? 4 : 0); core(x, b - 1); return; }
    const s = dir === 0 ? 1 : -1;
    for (let j = 0; j < h; j++) sp(x - s, b - j, mat, j === h - 1 ? 4 : 2);                 // 碟背
    sp(x, b, mat, 0); sp(x, b - h + 1, mat, 4);                                             // 上下碟沿（亮）
    core(x + s, b - 1);                                                                     // 馈源
  }
  // 头皮最高那一行（第 x 列）：支杆接到这里
  function headTop(h, x) { const u = (x - h.x) / (h.r + 0.35), q = 1 - u * u; return q <= 0 ? R(h.y) : Math.ceil(h.y - (h.r * 0.9 + 0.35) * Math.sqrt(q)); }
  // 候选部件：notchedWing 深扇贝膜翼——画法同 B.wing 的膜翼，但两指之间的膜边往腕部凹得更深（nq，缺省 0.4；平展 / 下压帧的纯黑剪影里也看得出 2 格深的凹口），
  //           翼指一直画到指尖（1 格亮线），poses 换翼姿表（平展帧把翼指扇得更开，给凹口留位置）
  const lerp = (a, b, q) => a + (b - a) * q;
  const WINGS_B = B.WINGS.map((w) => w.slice()); WINGS_B[2] = [0.3, -0.95, 0.1]; WINGS_B[3] = [-1.05, 0.2, 0.1];
  function notchedWing(x, y, pose, far, nq) {
    part(); nq = nq == null ? 0.4 : nq;
    const w = o.wing, W = WINGS_B[pose | 0] || WINGS_B[0], a0 = W[0], aT = W[1], fold = W[2], span = w.span, nf = w.fingers;
    const arm = span * (0.42 - 0.14 * fold), wx = x - Math.cos(a0) * arm, wy = y - Math.sin(a0) * arm, tips = [];
    for (let k = 0; k < nf; k++) { const q = k / (nf - 1), fa = a0 + (aT - a0) * (0.25 + 0.75 * q), fl = span * (0.62 - 0.12 * q) * (1 - 0.55 * fold); tips.push(wx - Math.cos(fa) * fl, wy - Math.sin(fa) * fl); }
    const bx = x - w.chord * (1 - 0.3 * fold), by = y + 1, mem = far ? m.wingFar : m.wing, bone = far ? m.boneFar : m.bone, p = [x, y, wx, wy];
    for (let k = 0; k < nf; k++) {
      p.push(tips[2 * k], tips[2 * k + 1]);
      const nx = k < nf - 1 ? tips[2 * k + 2] : bx, ny = k < nf - 1 ? tips[2 * k + 3] : by, dq = k < nf - 1 ? nq : 0.3;
      p.push(lerp((tips[2 * k] + nx) / 2, wx, dq), lerp((tips[2 * k + 1] + ny) / 2, wy, dq));
    }
    p.push(bx, by);
    U.poly(E, p, mem, 0);
    U.seg(E, x, y, wx, wy, 1, bone, 3);                                                     // 臂骨（前缘）
    for (let k = 0; k < nf; k++) U.seg(E, lerp(wx, tips[2 * k], k ? 0.35 : 0), lerp(wy, tips[2 * k + 1], k ? 0.35 : 0), tips[2 * k], tips[2 * k + 1], 1, bone, 3);   // 3 根黄铜翼骨伸到指尖（1 格亮线；后两根从 1/3 处起，腕部留出帆布，不挤成一块金）
    for (let k = 0; k < nf; k++) U.dot(E, tips[2 * k], tips[2 * k + 1], bone, 4);          // 指尖铆钉帽（亮）
    U.dot(E, wx + (a0 > 0 ? 0 : 1), wy - 1, m.claw, 3);                                    // 腕部铰链
  }
  // 候选部件：hangPod 吊舱——上沿黄铜镶边的小圆铁舱（7 格宽、4 行，逐行收窄），舱壁一排铆钉；lying 1 = 侧翻在地上（舱口朝右）
  const POD_ROWS = [[-3, 3], [-3, 3], [-2, 2], [-1, 1]];
  function hangPod(px, py, lying) {
    part();
    const put2 = (dx, dy, mt, t) => (lying ? sp(px + 3 - dy, py + dx, mt, t) : sp(px + dx, py + dy, mt, t));
    POD_ROWS.forEach(([a, b], dy) => { for (let dx = a; dx <= b; dx++) put2(dx, dy, dy === 0 ? M_GOLD : M_POD, dy === 0 && dx === a ? 4 : 0); });
    for (const dx of [-2, 0, 2]) put2(dx, 1, M_POD, 4);                                    // 铆钉
    put2(0, 3, M_POD, 2);
  }
  // 候选部件：rotaryGun 转管机枪——黄铜机匣 2×3 + 3 根枪管（spin 0–2 哪根在上面亮；3 = 高速残影，枪管逐列明暗交替）+ 一道黄铜箍 + 枪口（发光体，lv 0 暗 / 1–3 亮 / 4 熄）
  const SPIN_T = [4, 3, 2];
  function rotaryGun(px, py, spin, lv) {
    part();
    for (let j = -2; j <= 0; j++) for (let i = 3; i <= 4; i++) sp(px + i, py + j, M_GOLD, j === -2 ? 4 : i === 4 && j === 0 ? 2 : 0);
    sp(px + 3, py + 1, M_GOLD, 2);                                                          // 机匣下的握把
    for (let j = 0; j < 3; j++) for (let i = 5; i <= 8; i++) {
      if (i === 7) { sp(px + i, py - 2 + j, M_GOLD, j === 0 ? 4 : 3); continue; }           // 枪管箍
      const t = spin === 3 ? (((i + j) & 1) ? 4 : 2) : SPIN_T[(j + spin) % 3]; sp(px + i, py - 2 + j, M_GUN, t);
    }
    sp(px + 9, py - 2, M_GUN, 2); sp(px + 9, py, M_GUN, 2);
    if (lv >= 1 && lv <= 3) sp(px + 9, py - 1, M_MZ, lv === 1 ? 3 : 4); else sp(px + 9, py - 1, lv === 4 ? M_INK : M_GUN, lv === 4 ? 0 : 1);
  }
  // 候选部件：miniGunner 吊舱里的机枪手（3 格宽的头 + 皮帽前檐 + 护目镜，一行肩；duck 1 缩下去 1 格）
  function gunnerInPod(px, py) {
    part(); const d = P.duck;
    for (let x = px - 2; x <= px; x++) { sp(x, py - 1 + d, M_COAT, 0); }                    // 肩
    for (let y = py - 3 + d; y <= py - 2 + d; y++) for (let x = px - 2; x <= px; x++) sp(x, y, M_SKIN, 0);
    sp(px, py - 3 + d, P.eyes ? M_SKIN : M_GUN, P.eyes ? 1 : 4); sp(px - 1, py - 3 + d, M_CAP, 2);   // 护目镜 + 镜带
    sp(px + 1, py - 2 + d, M_SKIN, 0);                                                      // 鼻
    for (let x = px - 2; x <= px + 1; x++) sp(x, py - 4 + d, M_CAP, x === px + 1 ? 3 : 0);  // 皮帽 + 前檐
    sp(px - 3, py - 3 + d, M_CAP, 0); sp(px - 3, py - 2 + d, M_CAP, 2);                     // 帽后护耳
  }
  function gunnerHands(px, py) {
    part();
    if (P.rag) { const hx = px + 2 + P.rag; sp(px + 1, py - 2, M_COAT, 0); sp(px + 2, py - 2, M_COAT, 0); for (let x = px + 3; x < hx; x++) sp(x, py - 3, M_COAT, 0); sp(hx, py - 3, M_SKIN, 0); sp(hx + 1, py - 3, M_RAG, 0); sp(hx + 1, py - 4, M_RAG, 4); return; }
    if (P.bolt) { sp(px + 1, py - 2, M_COAT, 0); sp(px + 2, py - 3, M_SKIN, 0); sp(px + 3, py - 3, M_GUN, 4); return; }   // 拉枪栓
    sp(px + 1, py - 1 + P.duck, M_COAT, 0); sp(px + 2, py - 1, M_SKIN, 0);
  }
  // 候选部件：parachute 小降落伞 + 吊着的小人（伞 3 行穹顶、下沿扇贝、两道红条纹，伞绳 2 根；stage 1 刚弹开的伞包 · 2 张开 · 3 落地塌成一堆布）
  function parachuteMan(x, y, stage) {
    if (stage === 2) {
      part(); const top = y - 12;
      for (let k = 0; k < 3; k++) { const w = k === 0 ? 2 : 3; for (let i = -w; i <= w; i++) sp(x + i, top + k, (i === -1 || i === 2) ? M_STRIPE : M_CHUTE, k === 0 && i < 0 ? 4 : 0); }
      for (const i of [-3, -1, 1, 3]) sp(x + i, top + 3, M_CHUTE, 2);
      part(); for (let k = 1; k <= 3; k++) { sp(x - 3 + k * 0.7, top + 3 + k, M_LINE, 3); sp(x + 3 - k * 0.7, top + 3 + k, M_LINE, 3); }
    } else if (stage === 1) { part(); for (let i = -1; i <= 1; i++) { sp(x + i, y - 9, M_CHUTE, 0); sp(x + i, y - 8, i === 0 ? M_STRIPE : M_CHUTE, 0); } sp(x, y - 7, M_LINE, 3); }
    else if (stage === 3) { part(); for (let i = -7; i <= -2; i++) { sp(x + i, y, M_CHUTE, (i & 1) ? 2 : 0); if (i > -7 && i < -2) sp(x + i, y - 1, i === -4 ? M_STRIPE : M_CHUTE, 0); } sp(x - 5, y - 2, M_CHUTE, 4); sp(x - 1, y - 1, M_LINE, 3); }
    part();                                                                                 // 小人：皮帽、头、身、两只靴
    const up = stage === 2 || stage === 1;
    for (let i = -1; i <= 1; i++) sp(x + i, y - 5, M_CAP, i === 1 ? 3 : 0);
    sp(x - 1, y - 4, M_SKIN, 0); sp(x, y - 4, M_GUN, 4); sp(x - 1, y - 3, M_SKIN, 0); sp(x, y - 3, M_SKIN, 0);
    sp(x - 1, y - 2, M_COAT, 0); sp(x, y - 2, M_COAT, 0); sp(x - 1, y - 1, M_COAT, 0); sp(x, y - 1, M_COAT, 0);
    sp(x - 1, y, M_CAP, 0); sp(x + 1, y, M_CAP, 0);
    if (up) { sp(x - 2, y - 3, M_COAT, 0); sp(x - 2, y - 4, M_SKIN, 0); sp(x + 1, y - 3, M_COAT, 0); sp(x + 1, y - 4, M_SKIN, 0); }
    else { sp(x - 2, y - 2, M_COAT, 0); sp(x + 1, y - 2, M_SKIN, 0); }
  }
  // 身体铆钉 + 一道竖接缝（紧跟 B.fly.body 画，同一个部件）
  function rivets(C) {
    const inBody = (x, y) => { const u = (x - C.x) / (o.rx + 0.35), v = (y - C.y) / (rig.ry + 0.35); return u * u + v * v < 0.62; };
    for (let y = R(C.y) - 3; y <= R(C.y) + 3; y++) if (inBody(R(C.x) - 1, y)) sp(R(C.x) - 1, y, m.body, 2);
    for (const [dx, dy] of [[-3, -1], [-3, 1], [1, -2], [1, 1], [3, 0]]) { const x = R(C.x) + dx, y = R(C.y) + dy; if (inBody(x, y)) sp(x, y, m.body, 4); }
  }
  function rods(px, py) {
    part(); const top = R(rig.C.y);
    for (let y = top; y < py; y++) { sp(px - 3, y, M_GOLDF, 0); sp(px + 3, y, M_GOLDF, 0); }
  }
  // 两只雷达耳：远耳碟在头顶正上（碟中列 = 头心），近耳碟再往前 6 格、支杆从额头斜伸到吻上方（两只碟连勾线在内之间空 1 列）；
  // 碟底比头顶高 3 行（支杆 ≥ 2 格），都在翼根前面 ≥ 2 格
  function earsAt(h) { const x0 = R(h.x), x1 = x0 + 6, t0 = headTop(h, x0 - 1); return [x0, x1, t0 - 3, t0 - 1, headTop(h, x0 + 3) - 1]; }
  function drawLoose(far) {                                                                 // 脱落的翅膀（散架后）
    if (far) notchedWing(P.wfx, P.wfy, P.wfp, 1); else notchedWing(P.wnx, P.wny, P.wnp, 0);
  }
  function drawWreck() {                                                                    // 摔成几块：侧翻的吊舱、裂成两半的身体、滚开的头、掉在地上的枪
    hangPod(-13, -3, 1);
    rotaryGun(11, -1, 0, 4);
    F.body(E, rig, P, o);
    for (let y = -6; y <= 0; y++) { sp(-1 + (y & 1), y, 0, 0); sp(-(y & 1), y, 0, 0); }      // 裂缝（擦掉像素，两半之间只剩勾线）
    const h = { x: rig.head.x + 3, y: -2.6, r: rig.head.r }, rg = Object.assign({}, rig, { head: h, eye: [R(h.x + 1), R(h.y - 0.8)] });
    F.head(E, rg, P, o);
    radarEar(R(h.x + 4), -4, -1, 1, 0, M_DISH);
    part(); sp(-7, 0, M_GUN, 4); sp(22, 0, M_GOLD, 3); sp(-16, 0, M_GUN, 3);                  // 崩掉的铆钉
  }
  function drawHero() {
    begin(hero, P.bx, 0, 0);                                                                 // 贴地截断：吊舱 / 弹舱不画进地面以下
    const C = rig.C, h = rig.head, wp = P.gf >= 0 && !rig.lie ? B.FLAP[P.gf] : P.wing, [ex0, ex1, eb, ef0, ef1] = earsAt(h);
    if (P.dst >= 1) drawLoose(1);
    if (P.dst === 2) { drawWreck(); drawLoose(0); parachuteMan(P.gux, P.guy, P.chute); return; }
    const [px, py] = podAt();
    if (P.dst === 0) notchedWing(rig.wing.x + 0.5, rig.wing.y - 1.5, wp, 1);                    // 远翼（翼根往后挪，给雷达耳让出位置）
    radarEar(ex0, eb, ef0, P.rad, P.eg, M_DISHF);                                            // 远侧雷达耳
    rods(px, py);
    F.body(E, rig, P, o); rivets(C);
    if (P.dst === 0) gunnerInPod(px, py);
    hangPod(px, py, 0);
    rotaryGun(px, py, P.spin, P.gem);
    if (P.dst === 0) gunnerHands(px, py);
    if (P.dst === 0) notchedWing(rig.wing.x, rig.wing.y, wp, 0);                             // 近翼
    F.head(E, rig, P, o);
    radarEar(ex1, eb, ef1, P.rad, P.eg, M_DISH, ex0 + 3);
    if (P.dst === 1) { drawLoose(0); parachuteMan(P.gux, P.guy, P.chute); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  // 弹壳：预分配，stepFX 推进（重力、落地弹一下），fxFront 画成 1 格黄铜点（翻面时亮暗交替）
  const CN = 20, cOn = new Uint8Array(CN), cX = new Float32Array(CN), cY = new Float32Array(CN), cVX = new Float32Array(CN), cVY = new Float32Array(CN), cAge = new Float32Array(CN), cB = new Uint8Array(CN);
  function casing(x, y) { let i = 0; for (; i < CN - 1 && cOn[i]; i++); cOn[i] = 1; cX[i] = x; cY[i] = y; cVX[i] = -14 - Math.random() * 18; cVY[i] = -22 - Math.random() * 20; cAge[i] = 0; cB[i] = 0; }
  let mzT = 9, mzX = 0, mzY = 0, chargeAcc = 0, trailAcc = 0, smokeAcc = 0, soulAcc = 0, skHit = 0, lastGf = -1;
  const TY = HY - 15;
  function fire(k, spread) {                                                                // 从枪口发一颗曳光弹，吊舱下掉一颗弹壳
    const x = scrX(P.gx), y = HY + P.gy, tx = DUMMY_X - 4, vx = k === 2 ? 330 : 270, ty = TY + spread;
    shoot(k, x + 1, y, vx, tx, R_EL, (ty - y) * vx / Math.max(1, tx - x), { trail: { every: 2, life: [0.05, 0.1], back: [4, 10] }, glow: 3 });
    mzT = 0; mzX = x; mzY = y; const [px, py] = podAt(); casing(scrX(px + 4), HY + py + 1);
  }
  function onEnter(s) {
    if (s !== CAST) return;
    poseAt(CAST, 0, E.simT); const gx = scrX(P.gx), gy = HY + P.gy;
    releaseOrbit(40, 90, 0.2, 0.45); burst(gx, gy, 14, 50, 120, 0.2, 0.45, R_EL, 6); ring(gx, gy, 0, R_EL); shake(0.28, 2); flash(0.05);
    skHit = 0; fire(2, 0);
  }
  function onTime(s, t) {
    if (s === ATTACK) { const i = T_S.indexOf(t); if (i >= 0) { fire(1, i - 1); if (i === 0) sfx('swing', { kind: 'gun', w: 0.35 }); sfx('shoot', { proj: 'bullet' }); } }
    if (s === CAST) { const i = SK_T.indexOf(t); if (i >= 0) { fire(2, ((i * 5) % 7) - 3); if ((i & 3) === 3) sfx('shoot', { proj: 'bullet' }); } }
    if (s === DEATH) {
      if (t === T_POP) {                                                                  // 铰链崩开：两处翼根迸出银火花
        const x = scrX(1), y = HY - 18; burst(x, y, 10, 40, 90, 0.15, 0.35, R_EL, 10); burst(x + 2, y - 2, 6, 30, 70, 0.15, 0.3, FXI.impact, 8);
      }
      if (t === T_CRASH) {                                                                // 铁皮身体砸地摔散
        const x = scrX(0); for (let i = 0; i < 16; i++) spawn(K_DUST, x - 12 + Math.random() * 24, HY - 1, (Math.random() - 0.5) * 34, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
        burst(x, HY - 3, 12, 40, 90, 0.2, 0.4, FXI.impact, 20);
        for (let i = 0; i < 5; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 8, HY - 4, (Math.random() - 0.5) * 70, -40 - Math.random() * 40, 0.8, R_EL, { g: 320, floor: HY });
        shake(0.12, 1); sfx('fall', { w: 0.45 });
      }
      if (t === T_WN || t === T_WF) { const x = scrX(t === T_WN ? 3 : -8); for (let i = 0; i < 4; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 10, HY - 1, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); }
      if (t === T_GL) { const x = scrX(-20); for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, HY - 1, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.3, FXI.dust); }
    }
  }
  const EVENTS = [[], [], T_S, [], SK_T, [], [], [T_POP, T_CRASH, T_WN, T_WF, T_GL], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 7, 30, 80, 0.12, 0.3, R_EL, 6); burst(x, y, 4, 20, 50, 0.12, 0.25, FXI.impact, 4); hitDummy(0); sfx('hit', { mat: 'wood', w: 0.25 }); }
    else if (k === 2) {                                                                     // 扫射：目标身上一串银白火花 + 地上从近到远一排扬尘
      burst(x, y, 5, 30, 90, 0.1, 0.25, R_EL, 5); if (skHit % 3 === 0) fx.cross(x + 1, y, 3, R_EL, 0.15); hitDummy(0);
      const gx = DUMMY_X - 22 + skHit * 2.4; for (let i = 0; i < 2; i++) spawn(K_DUST, gx + Math.random() * 2, HY - 1, (Math.random() - 0.5) * 10, -8 - Math.random() * 10, 0.3 + Math.random() * 0.2, FXI.dust);
      put(R(gx), HY, EL[0]);
      if ((skHit & 3) === 0) sfx('impact', { pal: 'metal', w: 0.35 });
      skHit++;
    }
  }
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) { chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 9 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, a, r, 4 + Math.random() * 3); } }
    if (state === RECOVER && stT < 0.6) { smokeAcc += dt * 12; while (smokeAcc >= 1) { smokeAcc -= 1; spawnX(K_RISE, gx + 1, gy - 1, 3 + Math.random() * 4, -8 - Math.random() * 6, 0.6 + Math.random() * 0.4, FXI.dust, { age0: 0.2 }); } }
    if (state === MOVE) {
      trailAcc += dt * 10; while (trailAcc >= 1) { trailAcc -= 1; spawn(K_TRAIL, scrX(-4) + (Math.random() - 0.5) * 3, HY + R(rig.C.y) + 2, (P.flip ? 1 : -1) * (8 + Math.random() * 8), 3 + Math.random() * 4, 0.3 + Math.random() * 0.25, R_EL); }
      if (P.gf !== lastGf) { if (P.gf === 2) sfx('step', { w: 0.15 }); lastGf = P.gf; }      // 下扑那一拍（gf 2 = 下压帧）：翼骨铰链「咔嗒」
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 26, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    for (let i = 0; i < CN; i++) {
      if (!cOn[i]) continue; cAge[i] += dt; if (cAge[i] > 0.9) { cOn[i] = 0; continue; }
      if (cB[i] >= 2) continue;
      cVY[i] += 380 * dt; cX[i] += cVX[i] * dt; cY[i] += cVY[i] * dt;
      if (cY[i] >= HY - 1 && cVY[i] > 0) { cY[i] = HY - 1; if (cB[i] === 0) { cVY[i] *= -0.4; cVX[i] *= 0.5; cB[i] = 1; } else { cVY[i] = 0; cVX[i] = 0; cB[i] = 2; } }
    }
    mzT += dt;
  }
  function fxReset() { cOn.fill(0); mzT = 9; chargeAcc = 0; trailAcc = 0; smokeAcc = 0; soulAcc = 0; skHit = 0; lastGf = -1; }
  function fxBack(f12) {
    if (P.dq < 0.6 && P.dst < 2) {                                                          // 地面影子：放宽 + 中间压一段墨色，离地 12 格也看得见
      const a = P.dst ? P.lift : o.alt + P.lift, sx = scrX(0); groundShadow(sx, 11, a);
      const cw = Math.max(1, 4 - (a >> 3)); for (let dx = -cw; dx <= cw; dx++) put(sx + dx, E.FLOOR, 0);
    }
    if (P.rim >= 2 && P.dst === 0) floorGlow(gx12(), P.rim, EL, f12);
    shotFloorGlow(f12);
  }
  const gx12 = () => scrX(P.gx);
  function fxFront(f12) {
    if (mzT < 2 / 12) {                                                                     // 枪口十字光 2 帧
      const c = mzT < 1 / 12 ? EL[0] : EL[1];
      put(mzX, mzY, EL[0]); for (let r = 1; r <= 3; r++) put(mzX + r, mzY, r === 1 ? c : r === 2 ? EL[1] : EL[2]);
      put(mzX, mzY - 1, c); put(mzX, mzY + 1, c); if (mzT < 1 / 12) { put(mzX + 1, mzY - 1, EL[2]); put(mzX + 1, mzY + 1, EL[2]); put(mzX, mzY - 2, EL[2]); }
    }
    if (E.state === CHARGE && P.gem >= 2) { const x = scrX(P.gx), y = HY + P.gy; put(x + 2, y, EL[1]); put(x + 3, y, EL[2]); put(x, y - 2, EL[2]); put(x, y + 2, EL[2]); }
    for (let i = 0; i < CN; i++) { if (!cOn[i]) continue; if (cAge[i] > 0.7 && (f12 & 1)) continue; put(R(cX[i]), R(cY[i]), ((cAge[i] * 16) | 0) & 1 ? 14 : 5); }
  }
  function drawShot(k, x, y, d) {                                                           // 曳光小弹：1×2 白芯 + 银尾
    if (k > 2) return false;
    put(x + d, y, EL[0]); put(x, y, EL[0]); put(x - d, y, EL[1]); put(x - 2 * d, y, EL[2]); if (k === 2) put(x - 3 * d, y, EL[3]);
    return true;
  }

  return {
    name: '机枪蝠', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_MZ, M_CORE], HIT_POINT: [0, -15], EVENTS,
    SFX: { body: 'machine', how: 'shatter', pal: 'metal', style: 'blade', w: 0.45, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
