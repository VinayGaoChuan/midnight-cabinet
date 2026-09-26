// 小蜘蛛（衍生单位 · 混沌 · 战士 · 普通 · 近战 240）：「迷你版的污泥，在污泥死后生成。」—— 蛛母的粘液球孵出来的小蜘蛛（蛛母特性「粘液球」死后召唤 1 只）。
// 同组最小：头胸大、腹小（和蛛母正相反），腹部是一颗半透明的小粘液球；颜色和蛛母同一套（淤泥灰蓝身体 + 淡水蓝粘液）。
//   头顶扣着半片破卵壳当头盔（壳沿参差不齐）；最前面一对腿高举在身前，腿尖是骨白尖钩，像一对短剑；背上黏着一片更大的卵壳碎片，当小盾挡在身侧。
//   战士身份从剪影读出来：头盔、举起的前腿、盾。
// 攻击 = 刺：两条前腿交替向前戳。
// 技能「壳盾反刺」（无特性，按战士职业「近战输出 + 简单防御」做）：把背上的卵壳盾挪到身前、缩在盾后，盾面亮起半圈水色点阵 →
//   用盾一顶，前腿连刺两下（两道短斩击弧）→ 小十字星芒 + 水色溅液外爆，目标小摇。
// 死亡 = 啪地溅成一小滩粘液（死亡套件 melt），卵壳头盔弹开落在一旁。
// 身体用 parts-beast 的 bug（头胸 / 腹 / 头的位置、倒下的腿）；扇形步行腿、粘液腹、卵壳头盔、卵壳盾、举起的钩腿、盾前点阵弧是本模块的部件。设定卡见 pcd/batch-07/Spiderling/design.md。
PCD.define('Spiderling', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, death, put, scrX, floorGlow, bayer } = E;
  const B = E.parts.beast, G = B.bug, U = B.util, R = Math.round;

  // ───── 元素：污水 · 水色（water：白 21 → 水青 22 → 水蓝 41 → 深蓝 40 → 墨蓝 39），和蛛母同一色阶 ─────
  const R_EL = FXI.water, EL = FXR[R_EL];
  // ───── 材质（和蛛母同一套颜色）─────
  const SILT = E.ramp(['#11181b', '#243335', '#3e5354', '#637b7a']);                            // 淤泥灰蓝（steel 暗段偏绿）
  const SLIME = [39, 40, E.color('#5a9cb0'), E.color('#a8dce2')];                               // 粘液 / 卵壳：water / sky 淡段
  const R_SPLAT = fxRamp('slSplat', [SLIME[3], SLIME[2], 41, 40, 39]);                          // 溅开的粘液
  const R_CUT = fxRamp('slCut', [21, 21, 22, 22, 41]);                                           // 斩击弧：只用水色第 1–2 级（白、水青），和水滴分开
  const m = B.mats(E, { main: SILT, limb: [SILT[0], SILT[2], SILT[3], E.color('#9ab4ae')], claw: 'bone', eye: [0, 0, 49, 50] });
  m.far = E.defMat([SILT[0], SILT[1], SILT[1], SILT[2]], 1);
  const M = {
    shell: E.defMat(SILT, 1),                                   // 头胸 / 头
    goo: E.defMat([39, 40, 41, SLIME[2]], 1),                   // 小粘液球腹（比卵壳深一级，不和头盔、盾糊成一片）
    egg: E.defMat([40, SLIME[2], SLIME[3], 17], 1),             // 卵壳（头盔、盾）：淡水蓝，高光近白
    rune: E.defMat([40, 22, 22, 21], 1, 1),                     // 盾面亮起的水色点（发光体）
    eye: E.defMat([0, 0, 49, 50], 1, 1), tip: E.defMat('bone', 1), spec: E.defMat([21, 21, 21, 21], 1, 1),
  };
  const o = G.shape({ n: 4, rx: 3.2, ry: 2.4, under: 3, abd: { rx: 2.6, ry: 2.3, dx: -5.5, dy: -0.5 }, head: { rx: 2.3, ry: 2 }, span: 7, knee: 1.5, fan: 1, kneeOut: 0.5,
    farDx: 1.5, stride: 1.5, lift: 2, lw: 1, eyes: 0, fangs: 0, hair: 0, legsFront: 0, m });

  const HX = 80, DUR = DEFAULT_DUR.slice(), hero = new Sprite(52, 30, 24, 26);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 4, 7, 10], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of [m.eye, m.ink, m.spec, m.claw, M.eye, M.spec, M.tip, M.rune]) RIM.skip[k] = 1;
  // 姿势字段：gd 举腿架势 0 / 1（上下错一格）· jab 刺 0 不刺 / 1 近侧腿刺出 / 2 远侧腿刺出 / 3 两条一起收在盾后 · shp 卵壳盾 0 背上 / 1 挪到半路 / 2 身前 / 3 一顶
  //   sg 盾面点阵亮 0–2 · hat 头盔 0 戴着 / 1 飞出 / 2 落地（掉落物）· sq 粘液腹一挤 · sway 左右晃 -1..1
  const EXTRA = [['gd', 0, 1], ['jab', 0, 3], ['shp', 0, 3], ['sg', 0, 2], ['sq', 0, 1], ['sway', -1, 1]];
  const SPEC = G.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { G.reset(P); P.gd = 0; P.jab = 0; P.shp = 0; P.sg = 0; P.sq = 0; P.sway = 0; P.gx = 0; P.gy = 0; }
  reset();
  let rig = G.rig(P, o);
  const HIT_POINT = [0, -5];
  const HATDROP = { at: 0.3, dur: 0.28, dx: 9, hop: 6 };

  // ───── 姿势 ─────
  const T_J1 = 2 / 12, T_J2 = 4 / 12;                                      // 攻击：近侧腿、远侧腿先后刺出
  const T_BASH = 0, T_S1 = 2 / 12, T_S2 = 4 / 12;                         // 施放：盾顶、连刺两下
  function idle(tq, f12) {
    const lp = G.anim.idle(P, tq, f12, DUR[IDLE]), b = Math.floor(f12 / 12 * 2.5 + 1e-6);
    P.glow = 0; P.gd = b & 1; P.sway = [0, 1, 0, -1][(b >> 1) & 3];                               // 拳击架势：举着前腿左右晃
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = f12of(lp - 1.6); P.jab = [1, 0, 2, 0, 1][k] | 0; P.sway = k & 1 ? 0 : 1; }   // 待机个性：空拳试刺
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                  // 蹦跳：蹲 → 蹬起 → 最高 → 落下
      const f = G.anim.walk(P, tq); P.bob = 0; P.lift = [0, 2, 3, 1][f]; P.crouch = f === 0 ? 1 : 0; P.gd = f === 2 ? 1 : 0; P.sq = f === 0 ? 1 : 0;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      const k = f12of(tq);
      P.bx = k === 0 ? 0 : k === 1 ? -1 : k <= 5 ? 2 : k <= 7 ? 1 : 0; P.crouch = k === 1 ? 1 : 0;
      P.jab = k === 1 ? 3 : k === 2 || k === 3 ? 1 : k === 4 || k === 5 ? 2 : 0; P.jaw = k >= 2 && k <= 5 ? 1 : 0;
    } else if (st === CHARGE) {                                              // 把背上的盾挪到身前、缩在盾后
      P.shp = tq < 0.25 ? 0 : tq < 0.5 ? 1 : 2; P.crouch = tq < 0.5 ? 0 : 1; P.jab = tq >= 0.5 ? 3 : 0; P.bx = tq >= 0.5 ? -1 : 0;
      P.sg = tq < 0.7 ? 0 : tq < 1.05 ? 1 : 1 + (f12 & 1); P.rim = tq < 0.6 ? 1 : 2; P.glow = tq > 0.7 ? 2 : 0;
      if (tq > 1.1) P.bob = (f12 & 1) ? 0 : 1;
    } else if (st === CAST) {                                                // 盾一顶，前腿连刺两下
      const k = f12of(tq);
      P.shp = k <= 1 ? 3 : 2; P.bx = k <= 1 ? 3 : k <= 5 ? 2 : 1; P.sg = 2; P.rim = k <= 1 ? 3 : 2; P.glow = 2; P.jaw = 1;
      P.jab = k <= 1 ? 3 : k <= 3 ? 1 : k <= 5 ? 2 : 3;
    } else if (st === RECOVER) {
      P.shp = tq < 0.25 ? 2 : tq < 0.45 ? 1 : 0; P.bx = tq < 0.25 ? 1 : 0; P.jab = tq < 0.25 ? 3 : 0; P.sg = tq < 0.2 ? 1 : 0; P.rim = tq < 0.3 ? 2 : tq < 0.5 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12); else { G.anim.hurt(P, h); P.claw = 0; P.tail = 0; P.jab = h < 0.35 ? 3 : 0; P.sq = h < 0.2 ? 1 : 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.flash = d < 1 / 12 ? 1 : 0; P.bx = -2; P.crouch = 2; P.jab = 3; P.sq = 1; }
      else if (d < T_MELT - INCOMING) { P.lie = 1; P.bx = -2; P.sq = 1; const c = B.dropAt(d, HATDROP); P.drop = c[0]; P.dsx = c[1]; P.dsy = c[2]; }   // 腿软摊开，头盔弹开
      else { P.lie = 1; P.bx = -2; P.drop = 2; P.dsx = HATDROP.dx; P.dq = 1; }                   // 之后由死亡套件（melt）接管
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = G.rig(P, o); legPose(st);
    const s = shieldGeo(); P.gx = s.x + P.bx; P.gy = s.y;
    if (P.shp < 2 && P.sg === 0) { const f = frontTip(0); P.gx = R(f[0]) + P.bx; P.gy = R(f[1]); }
    B.key(P, SPEC);
  }
  // 举起的前腿（拳击架势）：股节从头下往上举到头盔顶的高度，胫节再往前、往下，末端 2 格骨白尖钩，钩尖在头前 3 格；远侧那条整体高 2 格
  //   jab 1 / 2：近侧 / 远侧那条平着戳出头前 7 格 · jab 3：两条收在头前（盾后）· gd 架势上下晃 1 格
  function frontLeg(far) {
    const Hd = rig.Hd, hf = Hd.x + Hd.rx, top = Hd.y - Hd.ry, j = P.jab, g = P.gd ? -1 : 0, f = far ? 1 : 0;
    const out = (j === 1 && !far) || (j === 2 && far), tuck = j === 3;
    const Bs = [Hd.x + 0.5 - f, Hd.y + 1 - f];
    if (out) return { B: Bs, K: [hf + 2, Hd.y - 2 - f], F: [hf + 7, Hd.y - 1 - f] };
    if (tuck) return { B: Bs, K: [hf + 0.5, top - 1 - f], F: [hf + 1.5, Hd.y - 1 - f] };
    return { B: Bs, K: [hf + 1.5, top - 2 - 2 * f + g], F: [hf + 3.5, Hd.y - 0.5 - 2 * f + g] };
  }
  function frontTip(far) { return frontLeg(far).F; }
  // 步行腿（第 2–4 对）扇形撒开：膝比头胸顶高 2.5 格（剪影上每侧 3 个膝峰 + 举起前腿的峰），脚往前后伸出身体 4 格以上
  //   kx 膝 · fx 脚（相对头胸中心）· kh 膝比头胸顶高几格；远侧腿膝往前 1 格、高 1 格，暗一级
  const WALK = { 1: { bx: 1.5, kx: -1, kh: 2.5, fx: 10.5 }, 2: { bx: 0, kx: -4, kh: 2.5, fx: -12 }, 3: { bx: -1.5, kx: -9, kh: 1.5, fx: -16 } };
  // 蹦跳：0 蹲（全脚着地）· 1 后脚蹬地、前脚先抬 · 2 最高（脚全收起）· 3 前脚先落地、后脚还悬着 —— [前脚 dx, dy, 后脚 dx, dy]
  const HOP = [[0, 0, 0, 0], [1, -1, -1, 0], [-1, -2, 1, -2], [1, 0, 0, -1]];
  function legPose(st) {
    if (rig.lie) return;
    const T = rig.T, top = T.y - T.ry, plant = P.bx + (P.sway > 0 ? 1 : 0), hop = st === MOVE && P.gf >= 0 ? HOP[P.gf] : HOP[0];
    for (const L of rig.legs) {
      if (L.i === 0) { const q = frontLeg(L.far); L.B = q.B; L.K = q.K; L.F = q.F; continue; }
      const w = WALK[L.i], f = L.far ? 1 : 0, back = L.i > 1, dx = back ? hop[2] : hop[0], dy = back ? hop[3] : hop[1];
      L.B = [T.x + w.bx + f, T.y - f]; L.K = [T.x + w.kx + f, top - w.kh - f + (P.crouch | 0) * 0.5];
      L.F = [T.x + w.fx + f * (back ? 1 : -1) + dx - plant, Math.min(0, dy)];
    }
  }
  // 卵壳盾：背上（腹前、头胸后，和头盔隔开 3 列以上）/ 挪到半路 / 身前 / 往前一顶
  function shieldGeo() {
    const T = rig.T, Hd = rig.Hd;
    if (rig.lie) return { x: R(T.x) - 1, y: -3 };
    if (P.shp === 0) return { x: R(T.x - 8), y: R(T.y - T.ry - 1) };                           // 黏在腹前的背上，竖出背线 3 格
    if (P.shp === 1) return { x: R(T.x + 1), y: R(T.y - T.ry - 1) };
    return { x: R(Hd.x + Hd.rx + (P.shp === 3 ? 2 : 1)), y: R(Hd.y - 0.5) };
  }

  // ───── 画 ─────
  // 候选部件：hookLeg —— 举起的钩腿：股节 → 胫节（1 格宽）→ 末端 2 格骨白尖钩（钩尖 + 往回勾的一格）
  function hookLeg(L, far) {
    const mat = far ? m.far : m.limb, t = far ? 2 : 3;
    U.seg(E, L.B[0], L.B[1], L.K[0], L.K[1], 1, mat, t); U.seg(E, L.K[0], L.K[1], L.F[0], L.F[1], 1, mat, t);
    U.dot(E, L.K[0], L.K[1], mat, t + 1);
    U.dot(E, L.F[0], L.F[1], M.tip, far ? 3 : 4); U.dot(E, L.F[0] - 1, L.F[1] + 1, M.tip, far ? 2 : 3);
  }
  // 候选部件：legSide（同 蛛母）—— 一侧的腿并成一个部件（1 格宽，远侧暗一级）；远侧举起的钩腿也并在里面
  function legSide(far) {
    E.part(); const mat = far ? m.far : m.limb;
    for (const L of rig.legs) {
      if (!!L.far !== !!far) continue;
      if (L.i === 0 && !rig.lie) { if (far) hookLeg(L, 1); continue; }
      U.seg(E, L.B[0], L.B[1], L.K[0], L.K[1], 1, mat, far ? 2 : 3); U.seg(E, L.K[0], L.K[1], L.F[0], L.F[1], 1, mat, far ? 2 : 3);
      U.dot(E, L.K[0], L.K[1], mat, far ? 3 : 4); U.dot(E, L.F[0], L.F[1], m.claw, far ? 2 : 3);
    }
  }
  // 候选部件：gooAbdomen —— 半透明小粘液球腹：左上一格白高光、中间一颗暗核、底部隔点沉淀；sq 一挤（压扁 1 格）
  function gooBelly() {
    E.part(); const A = rig.A, rx = A.rx + (P.sq ? 0.5 : 0), ry = A.ry - (P.sq ? 0.5 : 0), cy = rig.lie ? -ry - 0.3 : A.y + (P.sq ? 0.5 : 0);
    U.oval(E, A.x, cy, rx, ry, M.goo, 0);
    U.dot(E, A.x - 1, cy - 1, M.spec, 0); U.dot(E, A.x, cy - 1, M.goo, 4); U.dot(E, A.x + 0.5, cy + 0.5, M.goo, 1);
    U.dot(E, A.x - 1, cy + ry - 0.5, M.goo, 2); U.dot(E, A.x + 1, cy + ry - 0.5, M.goo, 2);
  }
  function cephalo() {
    const T = rig.T, Hd = rig.Hd;
    E.part();
    U.oval(E, T.x, T.y, T.rx, T.ry, M.shell, 0);
    U.dot(E, T.x - 1, T.y + 1, M.shell, 2); U.dot(E, T.x + 1, T.y + 1, M.shell, 2);             // 头胸下的凹纹
    U.oval(E, Hd.x, Hd.y, Hd.rx, Hd.ry, M.shell, 0);                                            // 头（并进头胸：小身体上少一道分界线）
    const ex = R(Hd.x), ey = R(Hd.y);                                                          // 眼排（露出 3 只，蓄力时全亮）
    for (let k = 0; k < 3; k++) U.dot(E, ex + k - 1 + (k === 2 ? 1 : 0), ey + (k === 2 ? 1 : 0), M.eye, P.glow >= 2 || !(k & 1) ? 4 : 3);
    const x = R(Hd.x + Hd.rx - 0.5), y = R(Hd.y + Hd.ry * 0.5), j = P.jaw | 0;              // 小螯牙
    U.dot(E, x, y + 1, M.tip, 3); U.dot(E, x + j, y + 2, M.tip, 4);
  }
  // 候选部件：eggHelm —— 半片破卵壳头盔：6 × 3 的圆顶扣在头的前端，高出头顶 2 格；壳沿朝下，每 2 列垂一个 1 格的尖（参差）；
  //   淡水蓝 #a8dce2，左上高光 17，右端和壳沿暗一级，一道裂纹；at = [x, y] 时画成掉在地上的碗（开口朝上）
  function eggHelm(at) {
    E.part();
    if (at) { const [x, y] = at; for (let i = -2; i <= 2; i++) U.dot(E, x + i, y, M.egg, Math.abs(i) === 2 ? 3 : 2); for (const i of [-3, -1, 2, 3]) U.dot(E, x + i, y - 1, M.egg, i === -3 ? 4 : 3); return; }
    const Hd = rig.Hd, x0 = R(Hd.x) - 2, y0 = R(Hd.y - Hd.ry) - 2;                              // 顶行 y0，壳沿 y0 + 2，头顶线 y0 + 2
    for (let i = 1; i <= 4; i++) U.dot(E, x0 + i, y0, M.egg, i <= 2 ? 4 : 3);                    // 圆顶
    for (let i = 0; i <= 5; i++) U.dot(E, x0 + i, y0 + 1, M.egg, i === 0 ? 4 : i === 5 ? 2 : 3);
    for (let i = 0; i <= 5; i++) U.dot(E, x0 + i, y0 + 2, M.egg, i === 5 ? 2 : i === 3 ? 1 : 3);   // 壳沿（i 3 是一道裂纹）
    for (const i of [0, 2, 5]) U.dot(E, x0 + i, y0 + 3, M.egg, 2);                                // 破口朝下：参差的尖
  }
  // 候选部件：eggShield —— 卵壳碎片小盾：竖起的一片弧形壳（6 高 × 4 宽，凸面朝前），上沿锯齿、一道裂纹；sg 盾面亮起一圈水色点
  function eggShield() {
    E.part();
    const s = shieldGeo();
    if (rig.lie) { for (let i = -2; i <= 3; i++) U.dot(E, s.x + i, -1, M.egg, i === -2 ? 4 : 3); U.dot(E, s.x + 1, -2, M.egg, 4); return; }   // 倒下：壳片平摊在身上
    const H = 6, xs = s.x, ys = s.y;
    for (let j = 0; j < H; j++) {
      const y = ys - 3 + j, w = j === 0 || j === H - 1 ? 2 : 3, x0 = xs - (j === 0 || j === H - 1 ? 0 : 1) + (j >= 2 && j <= 3 ? 1 : 0);   // 凸面朝前
      for (let i = 0; i < w; i++) U.dot(E, x0 + i, y, M.egg, i === 0 ? 4 : i === w - 1 ? 2 : 3);
    }
    U.dot(E, xs - 1, ys - 4, M.egg, 4); U.dot(E, xs + 1, ys - 4, M.egg, 3);                    // 上沿锯齿（两个尖）
    U.dot(E, xs, ys - 1, M.egg, 1); U.dot(E, xs + 1, ys, M.egg, 1);                           // 裂纹
    if (P.sg) { U.dot(E, xs + 2, ys - 2, M.rune, P.sg === 2 ? 4 : 3); U.dot(E, xs + 2, ys + 1, M.rune, 3); if (P.sg === 2) U.dot(E, xs + 1, ys - 3, M.rune, 3); }
  }
  function drawHero() {
    begin(hero, P.bx + (P.sway > 0 ? 1 : 0), 0);
    legSide(1);
    legSide(0);                                                             // 步行腿都在身体后面：膝峰从背线上拱出来、脚从身下往前后撒开
    gooBelly();
    cephalo();
    if (!P.drop) eggHelm(null);
    if (P.shp === 0 || rig.lie) eggShield();
    if (!rig.lie) { E.part(); hookLeg(rig.legs.find((l) => l.i === 0 && !l.far), 0); }   // 近侧举起的钩腿画在身体前（刺出去时压在盾上）
    if (P.shp > 0 && !rig.lie) eggShield();
    if (P.drop && !capture) eggHelm([R(rig.Hd.x) + P.dsx, -1 - P.dsy]);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const T_MELT = INCOMING + 0.66;
  let capture = false;                                                      // 交给死亡套件的那一帧不画落地的头盔（它另外画在 fxFront 里，不跟着融掉）
  let lastGf = -9, chargeAcc = 0, soulAcc = 0, jabT = 9, jabX = 0, jabY = 0;
  function tipScr() { const f = frontTip(P.jab === 2 ? 1 : 0); return [scrX(R(f[0]) + P.bx), HY + R(f[1])]; }
  function stab(big) {                                                     // 刺中：尖钩一点白 + 水色溅液
    const [x, y] = tipScr(); jabT = 0; jabX = x; jabY = y;
    burst(x + 1, y, 6, 30, 80, 0.12, 0.3, big ? R_EL : FXI.impact, 6);
    if (big) { fx.cross(x + 1, y, 3, R_EL, 0.22); for (let i = 0; i < 4; i++) spawnX(K_PHYS, x + 1, y, 10 + Math.random() * 50, -30 - Math.random() * 40, 0.4 + Math.random() * 0.25, R_SPLAT, { g: 240, floor: FLOOR - 1 }); }
    hitDummy(0, 1);
  }
  function onEnter(s) {
    if (s === CAST) {                                                      // 盾一顶：盾前的水滴外爆（盾本身不被遮住，轮廓光白边露出来），点阵弧往外一撑
      poseAt(CAST, 0, E.simT); hero.k1 = hero.k2 = -1;
      const x = scrX(P.gx) + ARC_R, y = HY + P.gy - 1;
      releaseOrbit(30, 70, 0.2, 0.4, { pts: 1, at: [x + 1, y] }); burst(x + 1, y, 8, 30, 80, 0.2, 0.4, R_EL, 5); ring(x + 1, y, 0, R_EL);
      shake(0.28, 2); flash(0.05); hitDummy(0, 1);
    }
  }
  function onTime(s, t) {
    if (s === CHARGE && t === 0.7) sfx('impact', { pal: 'water', w: 0.05 });   // 盾前亮起半圈水色点阵（画在 fxFront：arcDots）
    if (s === ATTACK && t === T_J1) { stab(0); sfx('swing', { kind: 'thrust', w: 0.1 }); sfx('hit', { mat: 'flesh', w: 0.1 }); }
    if (s === ATTACK && t === T_J2) { stab(0); sfx('hit', { mat: 'flesh', w: 0.1 }); }
    if (s === CAST && (t === T_S1 || t === T_S2)) {                       // 两道短斩击弧 + 小十字星芒 + 溅液
      poseAt(CAST, t, t); const [x, y] = tipScr();
      fx.slash(x - 5, y + 1, 6, t === T_S1 ? 0.6 : 1.9, t === T_S1 ? 1.9 : 0.8, R_CUT, 0.18, 2, 2);   // 在盾前面，只用白 / 水青两级
      stab(1); if (t === T_S2) { hitDummy(1, 1); shake(0.12, 1); }
      sfx('impact', { pal: 'water', w: 0.15 });
    }
    if (s === DEATH && t === INCOMING + HATDROP.at) { poseAt(DEATH, t, t); const x = scrX(R(rig.Hd.x) + P.bx), y = HY - 7; burst(x, y, 6, 20, 50, 0.15, 0.3, R_EL, 8); sfx('hit', { mat: 'stone', w: 0.03 }); }   // 卵壳「嗒」：轻脆
    if (s === DEATH && t === T_MELT) {                                     // 啪地溅成一小滩：把当前帧交给死亡套件
      poseAt(DEATH, t - 1e-3, t); capture = true; drawHero(); bakeHero(); capture = false; hero.k1 = hero.k2 = -1;
      death.start('melt', { fadeAt: 1.1, fadeDur: 0.6 });
      for (let i = 0; i < 16; i++) spawnX(K_PHYS, HX - 2 + (Math.random() - 0.5) * 8, HY - 3, (Math.random() - 0.5) * 70, -25 - Math.random() * 45, 0.5 + Math.random() * 0.3, R_SPLAT, { g: 240, floor: FLOOR - 1 });
      ring(HX - 2, HY - 2, 0, R_SPLAT); shake(0.08, 1); sfx('fall', { w: 0.1 });
    }
  }
  const EVENTS = [[], [], [T_J1, T_J2], [0.7], [T_S1, T_S2], [], [], [INCOMING + HATDROP.at, T_MELT], []];
  function hurtFx(s) {                                                     // 软身体：溅出水色粘液 + 少量撞击火花
    const hx = HX + HIT_POINT[0], hy = HY + HIT_POINT[1];
    burst(hx, hy, s === DEATH ? 12 : 8, 40, 110, 0.2, 0.45, FXI.impact, 14);
    for (let i = 0; i < (s === DEATH ? 10 : 6); i++) spawnX(K_PHYS, hx, hy, (Math.random() - 0.7) * 60, -20 - Math.random() * 40, 0.45, R_SPLAT, { g: 240, floor: FLOOR - 1 });
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === MOVE && P.gf !== lastGf) {                               // 落地那一下噗叽 + 一滴粘液
      if (P.gf === 0) { sfx('step', { w: 0.1 }); spawnX(K_PHYS, scrX(-5 + P.bx), HY - 2, 0, 8, 0.4, R_SPLAT, { g: 120, floor: FLOOR - 1, age0: 0.2 }); }
      lastGf = P.gf;
    }
    if (state === CHARGE && stT > 0.5) {                                   // 水滴汇聚到盾前的点阵弧上（不压在盾面上），数量减半
      const x = scrX(P.gx) + ARC_R, y = HY + P.gy - 1; chargeAcc += dt * (5 + 7 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 7 + Math.random() * 5, a = -1.2 + Math.random() * 2.4; spawnX(K_SPIRAL_PT, x, y, (r - 2) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 5, tx: x, ty: y, orbitR: 2, orbitW: -8, squash: 0.8 }); }
    }
    if (state === DEATH && stT > INCOMING + 1.5 && stT < INCOMING + 2.3) {
      soulAcc += dt * 10; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 14, HY - 1 - Math.random() * 2, (Math.random() - 0.5) * 6, -10 - Math.random() * 10, 0.7 + Math.random() * 0.5, FXI.soul); }
    }
    jabT += dt;
  }
  function fxReset() { lastGf = -9; chargeAcc = 0; soulAcc = 0; jabT = 9; }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  // 候选部件：arcDots —— 盾前的半圈点阵（代替整圈 fx.dome）：半径 ARC_R 的弧，只画盾前 ±57°，每 2 格一个 1 格的点，按角度逐点亮起
  const ARC_R = 6, ARC_N = 7;
  function arcDots(cx, cy, r, lit, hot, f12) {
    for (let k = 0; k < ARC_N; k++) {
      if (k >= lit) continue;
      const a = (k - (ARC_N - 1) / 2) * 0.33, x = R(cx + Math.cos(a) * r), y = R(cy + Math.sin(a) * r);
      put(x, y, hot ? ((k + f12) % 3 === 0 ? EL[0] : EL[1]) : EL[2]);
    }
  }
  function fxFront(f12) {
    if (!P.lie && (E.state === CHARGE && E.stT >= 0.7 || E.state === CAST && E.stT < 2 / 12)) {   // 盾前点阵：0.7 s 逐点亮起 → 1.05 s 后闪 → 施放时往外一撑
      const cx = scrX(P.gx) + 0.5, cy = HY + P.gy - 1;
      if (E.state === CHARGE) arcDots(cx, cy, ARC_R, Math.min(ARC_N, 1 + Math.floor((E.stT - 0.7) * 24)), E.stT >= 1.05, f12);
      else arcDots(cx, cy, ARC_R + (E.stT < 1 / 12 ? 1 : 2.5), ARC_N, 1, f12);
    }
    if (jabT < 2 / 12) {                                                    // 刺出的一道短拖影（第 1 帧亮、第 2 帧断续）
      const first = jabT < 1 / 12;
      for (let k = 1; k <= 5; k++) { if (!first && (k & 1)) continue; put(jabX - k - 1, jabY, first ? (k < 3 ? EL[0] : EL[1]) : EL[2]); }
    }
    if (E.state === DEATH && E.stT >= T_MELT && E.stT < T_MELT + 1.7) {     // 死亡套件接管后，头盔还躺在一旁（最后按抖动淡去）
      const x = scrX(R(rig.Hd.x) + HATDROP.dx + P.bx), fade = E.stT > T_MELT + 1.1 ? (E.stT - T_MELT - 1.1) / 0.6 : 0, eg = [SLIME[2], SLIME[3], 17];
      const px = (dx, dy, c) => { const X = x + dx, Y = HY - 1 + dy; if (bayer(X, Y) >= fade) put(X, Y, c); };
      for (let i = -2; i <= 2; i++) px(i, 0, Math.abs(i) === 2 ? eg[0] : eg[1]); for (const i of [-3, -1, 2, 3]) px(i, -1, i === -3 ? eg[2] : eg[1]); px(0, 1, 40);
    }
  }

  return {
    name: '小蜘蛛', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.rune, M.eye], HIT_POINT, EVENTS,
    deathKit: { mode: 'melt', at: T_MELT },
    REVIVE: { dy: -6, ramp: 'water' },
    SFX: { body: 'beast', how: 'dissolve', pal: 'water', style: 'shield', w: 0.1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
