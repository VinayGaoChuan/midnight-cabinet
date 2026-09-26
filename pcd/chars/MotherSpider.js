// 蛛母（敌人 · 混沌 · 普通 · 近战 240）：「在下水道中适应出魔法抗性的单位」；特性「粘液球」：当单位死亡时，原地召唤 1 个小蜘蛛（fx 召唤）。
// 一团下水道污泥长出来的蜘蛛：头胸小、低伏，身后高高鼓起一只半透明的粘液卵囊（占六成体积），囊里蜷着 3 只小蜘蛛的暗影，随呼吸一胀一缩；
//   卵囊底部垂着 3 条污泥滴丝拖到地面；头胸背上顶着一撮下水道烂草和一只锈铁瓶盖，像一顶小帽；头前 8 只小眼排成一排。
// 攻击 = 咬：前两对腿抬起，头胸往前压，螯牙一合。
// 技能「粘液球」（被动特性，表现它生效的样子）：卵囊一下下越胀越大、四周的污水滴汇聚到囊上、囊里的小蜘蛛影子乱动 →
//   腹尖一挤，吐出一颗 6×6 的粘液球，抛物线越过背落到身前 → 啪地溅开、地面一个小法阵，一只小蜘蛛剪影从法阵里爬出来并闪白，带一个小冲击环。
// 死亡 = 腹囊撑破、污泥溅开，瓶盖弹飞；身体摊平融掉（死亡套件 melt），一只小蜘蛛从污泥里爬出来（呼应粘液球）。
// 身体用 parts-beast 的 bug（腿骨架、步态）；粘液卵囊、滴丝、头胸 + 眼排、烂草瓶盖、螯牙是本模块的部件。
PCD.define('MotherSpider', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, death, put, scrX, floorGlow, bayer } = E;
  const B = E.parts.beast, G = B.bug, U = B.util, R = Math.round;

  // ───── 元素：污水 · 下水道浑水（water：白 21 → 水青 22 → 水蓝 41 → 深蓝 40 → 墨蓝 39；汇聚以第 3–5 级为主）─────
  const R_EL = FXI.water, EL = FXR[R_EL];
  const R_MURK = fxRamp('msMurk', [22, 41, 40, 39, 39]);                                        // 浑水滴（汇聚）
  // ───── 材质 ─────
  const SILT = E.ramp(['#11181b', '#243335', '#3e5354', '#637b7a']);                            // 淤泥灰蓝（steel 暗段偏绿）
  const SLIME = [39, 40, E.color('#5a9cb0'), E.color('#a8dce2')];                               // 粘液卵囊：water / sky 淡段
  const R_SLUDGE = fxRamp('msSludge', [SLIME[3], SLIME[2], 40, 35, 34]);                        // 死亡溅开的污泥（囊液 → 苔泥）
  const m = B.mats(E, { main: SILT, limb: [SILT[0], SILT[2], SILT[3], E.color('#9ab4ae')], claw: 'bone', eye: [0, 0, 49, 50] });   // 细腿比头胸亮一级
  m.far = E.defMat([SILT[0], SILT[1], SILT[1], SILT[2]], 1);                                   // 远侧腿再暗一级，和近侧腿分开
  // 第 1 轮返修：近侧腿 = SILT 基 / 亮（sk[2] / sk[3]），勾线用 sk[1]（不再压成墨黑）；远侧腿暗一级（sk[1] / sk[2]）
  const LEG_N = E.defMat([SILT[1], SILT[2], SILT[2], SILT[3]], 1), LEG_F = E.defMat([SILT[1], SILT[1], SILT[1], SILT[2]], 1);
  const M = {
    shell: E.defMat(SILT, 1),                            // 头胸 / 头（小块 band 1）
    sac: E.defMat(SLIME, 2),                             // 粘液卵囊（大面积 band 2）
    drip: E.defMat([39, 34, 35, 36], 1, 1),              // 污泥滴丝（moss 暗段，平涂：不压分界线；勾线用墨蓝 39，贴着夜空几乎看不见，丝读成 1 格）
    grass: E.defMat([34, 35, 36, 37], 1, 1),             // 下水道烂草（苔绿亮段，平涂，草叶伸出轮廓）
    cap: E.defMat('iron', 1), rust: E.defMat([20, 44, 45, 32], 1),   // 锈铁瓶盖（iron 基色 + 亮顶边）+ 锈斑
    eye: E.defMat([0, 0, 49, 50], 1, 1), eyeG: E.defMat([49, 50, 38, 21], 1, 1),   // 8 只小眼（下水道黄绿；蓄力发亮）
    fang: E.defMat(SILT, 1), tip: E.defMat('bone', 1), spec: E.defMat([21, 21, 21, 21], 1, 1),
  };
  // 卵囊抬高到腿拱之上（底边离地约 10 格），腿在剪影里露出 4 道 ∧；膝比头胸背线高 2 格
  const o = G.shape({ n: 4, rx: 3, ry: 2, under: 2, abd: { rx: 6.5, ry: 5, dx: -7.5, dy: -12.5 }, head: { rx: 2, ry: 1.6 }, span: 10, knee: 2, fan: 1, kneeOut: 0.5,
    farDx: 0, stride: 2, lift: 2, lw: 1, eyes: 0, fangs: 0, hair: 0, legsFront: 0, m });

  const HX = 80, DUR = DEFAULT_DUR.slice(), hero = new Sprite(58, 38, 32, 35);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 13, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of [m.eye, m.ink, m.spec, m.claw, M.eye, M.eyeG, M.spec, M.tip, M.cap, M.rust, M.grass, M.drip]) RIM.skip[k] = 1;
  // 姿势字段：fl 前两对腿 0 着地 / 1 梳理螯牙 / 2 抬起 / 3 前压 · gr 梳理相位 · sw 卵囊鼓胀 0–3 · sq 腹尖一挤 · sx 卵囊前后晃 -1..1
  //   sh 囊里小蜘蛛影子乱动 0–3 · pop 卵囊撑破 · dsw 滴丝摆 -1..1 · eg 眼排发亮
  const EXTRA = [['fl', 0, 3], ['gr', 0, 2], ['sw', 0, 3], ['sq', 0, 1], ['sx', -1, 1], ['sh', 0, 3], ['pop', 0, 1], ['dsw', -1, 1], ['eg', 0, 1]];
  const SPEC = G.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { G.reset(P); P.fl = 0; P.gr = 0; P.sw = 0; P.sq = 0; P.sx = 0; P.sh = 0; P.pop = 0; P.dsw = 0; P.eg = 0; P.gx = 0; P.gy = 0; }
  reset();
  let rig = G.rig(P, o);
  const HIT_POINT = [-3, -8];
  const CAPDROP = { at: 0.5, dur: 0.1, dx: 9, hop: 5 };                  // 瓶盖在腹囊撑破时弹飞

  // ───── 姿势 ─────
  const F = ['bx', 'crouch', 'pitch'];
  const REST = { bx: 0, crouch: 0, pitch: 0 };
  const T_HIT = 2 / 12, T_LAND = 3 / 12, T_POP = 4 / 12, T_BURST = 10 / 12, T_MELT = 12 / 12;
  const ATK = [[0, REST], [0.12, { bx: -1, crouch: 0, pitch: 2 }, 'out'], [T_HIT, { bx: 5, crouch: 1, pitch: 0 }, 'snap'], [0.45, { bx: 3, crouch: 1, pitch: 0 }, 'out'], [0.75, REST, 'inOut']];
  const C_UP = { bx: -1, crouch: 1, pitch: 0 };
  const tmp = {};
  const apply = (src) => { for (const f of F) P[f] = R(src[f]); };

  function idle(tq, f12) {
    const lp = G.anim.idle(P, tq, f12, DUR[IDLE]), b = Math.floor(f12 / 12 * 2.5 + 1e-6);
    P.sw = (b + 1) & 1; P.sh = P.sw; P.dsw = [0, 1, 0, -1][(b + 1) & 3]; P.eg = 0;
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = f12of(lp - 1.6); P.fl = 1; P.gr = [0, 1, 2, 0, 1][k] | 0; P.jaw = P.gr === 2 ? 2 : 1; }   // 待机个性：前腿勾到螯牙顶 → 往下捋 → 滑到牙尖（3 帧一轮）
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                        // 八足慢爬：腹囊拖在身后前后晃，滴丝反向摆
      const f = G.anim.walk(P, tq); P.sx = [-1, 0, 1, 0][f]; P.dsw = [1, 0, -1, 0][f]; P.sw = f & 1; P.sh = f & 1;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F); apply(tmp);
      const k = f12of(tq);
      P.fl = k <= 1 ? (k === 0 ? 0 : 2) : k <= 5 ? 3 : 0; P.jaw = k === 1 ? 2 : k === 0 ? 1 : 0;
      P.sx = k === 1 ? -1 : k >= 2 && k <= 4 ? 1 : 0; P.dsw = -P.sx; P.eg = k >= 1 && k <= 4 ? 1 : 0; P.sw = k >= 2 && k <= 3 ? 1 : 0;
    } else if (st === CHARGE) {                                                    // 卵囊一下下越胀越大，囊里的小蜘蛛影子乱动
      if (tq < 0.7) { E.mix(tmp, REST, C_UP, ease.inOut(tq / 0.7), F); apply(tmp); } else apply(C_UP);
      P.sw = tq < 0.35 ? 1 : tq < 0.7 ? 2 : tq < 1.0 ? 3 : 2 + ((f12 & 1) ? 1 : 0);
      P.sh = tq < 0.45 ? ((f12 >> 1) & 1) : f12 & 3; P.dsw = (f12 & 1) ? 1 : -1; P.eg = tq >= 0.45 ? (f12 & 1) : 0; P.jaw = 1;
      P.rim = 2; P.fl = tq > 0.2 ? 2 : 0;
    } else if (st === CAST) {                                                      // 腹尖一挤（2 帧定格），吐出粘液球
      apply(C_UP); P.bx = 1; P.sq = tq < 2 / 12 ? 1 : 0; P.sw = tq < 2 / 12 ? 0 : 1; P.sx = tq < 2 / 12 ? 1 : 0; P.sh = 2; P.dsw = -1;
      P.eg = 1; P.rim = 3; P.fl = 2; P.jaw = 2;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, C_UP, REST, q, F); apply(tmp);
      P.sw = q < 0.5 ? 1 : 0; P.fl = q < 0.4 ? 2 : 0; P.rim = q < 0.5 ? 2 : q < 0.85 ? 1 : 0; P.eg = q < 0.3 ? 1 : 0; P.dsw = q < 0.5 ? ((f12 & 1) ? 1 : -1) : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else { G.anim.hurt(P, h); P.claw = 0; P.tail = 0; if (h < 0.2) { P.fl = 2; P.sw = 2; P.sx = 1; P.dsw = 1; P.sh = 3; } else if (h < 0.35) { P.sw = 1; P.sx = 0; P.dsw = -1; } }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.flash = d < 1 / 12 ? 1 : 0; P.bx = -2; P.crouch = 2; P.fl = 2; P.jaw = 2; P.sw = 2; P.sx = 1; P.sh = 3; }
      else if (d < 0.5) { P.lie = 1; P.bx = -3; P.sw = 3; P.sx = (f12 & 1) ? 1 : -1; P.sh = f12 & 3; P.jaw = 2; }   // 腿软摊开、腹囊撑到最大、发抖
      else if (d < 0.75) { P.lie = 1; P.bx = -3; P.pop = 1; const c = B.dropAt(d, CAPDROP); P.drop = c[0]; P.dsx = c[1]; P.dsy = c[2]; }   // 撑破 → 瓶盖弹飞
      else { P.lie = 1; P.bx = -3; P.pop = 1; P.drop = 2; P.dsx = CAPDROP.dx; P.dq = 1; }   // 之后由死亡套件（melt）接管
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = G.rig(P, o); legLayout(); legPose();
    const s = sacGeo(); P.gx = R(s.cx) + P.bx; P.gy = R(s.cy);
    B.key(P, SPEC);
  }
  // 腿的站位：近侧 4 条腿的膝 / 足 x（前 → 后），站着时 4 道 ∧ 分开：前两道在头上方，后两道在卵囊底下；步态位移沿用 rig 的
  const LK = [7, 3, -4, -8.5], LF = [11, 5.5, -7, -12];
  function legLayout() {
    if (rig.lie) return;
    const gf = P.gf; P.gf = -1; const r0 = G.rig(P, o); P.gf = gf;
    rig.legs.forEach((L, j) => {
      const L0 = r0.legs[j], fd = L.far ? o.farDx : 0;
      L.K = [LK[L.i] + fd + (L.K[0] - L0.K[0]), L.K[1]]; L.F = [LF[L.i] + fd + (L.F[0] - L0.F[0]), L.F[1]];
    });
  }
  // 前两对腿的姿势：按腿根偏移改写 rig 里的膝 / 足
  const FL = [null,
    [[3, -4, 6, -2], [2, -4, 3, -1]],                                             // 1 梳理：前腿勾到螯牙顶（足尖按 gr 往下捋 0 → 1 → 2 格）
    [[3, -6, 7, -10], [2, -5, 5, -8]],                                            // 2 抬起
    [[5, -4, 10, -1], [4, -4, 8, 0]]];                                            // 3 前压
  function legPose() {
    if (!P.fl || rig.lie) return;
    for (const L of rig.legs) {
      if (L.i > 1 || (P.fl === 1 && L.i > 0)) continue;
      const S = FL[P.fl][L.i], d = L.far ? 1 : 0;
      L.K = [L.B[0] + S[0] + d, L.B[1] + S[1]]; L.F = [L.B[0] + S[2] + d, L.B[1] + S[3] + (P.fl === 1 && L.i === 0 ? P.gr : 0)];
    }
  }
  // 卵囊几何：鼓胀时往上长（底边不动，滴丝挂在底边上）；倒地时贴地
  const SWX = [0, 0.6, 1.2, 2], SWY = [0, 0.5, 1, 1.7];
  function sacGeo() {
    const A = rig.A, rx = A.rx + SWX[P.sw] - (P.sq ? 1.2 : 0), ry = A.ry + SWY[P.sw] + (P.sq ? 0.5 : 0);
    const cx = A.x + P.sx + (P.sq ? 1 : 0), cy = rig.lie ? -ry - 0.5 : A.y - (ry - A.ry);
    return { cx, cy, rx, ry };
  }

  // ───── 画 ─────
  // 候选部件：slimeDrips（腹下污泥滴丝）—— 从卵囊底边垂下的 1 格断续细丝（每 3 格断 1 格，平涂 moss，勾线墨蓝贴夜空），画在腿后面；
  //   下端随 dsw 摆，拖到地面的那条在地上摊成 3 格小泥洼，短的那条挂一颗泥滴
  const DRIP = [[-6.2, 1], [-4.4, 1], [-2.4, 0]];                                        // [卵囊中心的 x 偏移, 1 = 拖到地面 / 0 = 半截挂一颗泥滴]
  function drips(s) {
    E.part();
    for (const [u, full] of DRIP) {
      const x0 = s.cx + u, q = 1 - (u / s.rx) * (u / s.rx), yb = R(s.cy + s.ry * Math.sqrt(Math.max(0, q)) + 0.3), y1 = full ? -1 : Math.min(-2, yb + 4);
      for (let y = yb; y <= y1; y++) { if ((y - yb) % 3 === 2) continue; const k = (y - yb) / Math.max(1, -yb), x = R(x0 + P.dsw * k * (full ? 1.2 : 1)); U.dot(E, x, y, M.drip, y - yb < 2 ? 4 : 3); }
      const xe = R(x0 + P.dsw * (full ? 1.2 : 0.6));
      if (full) { U.dot(E, xe - 1, 0, M.drip, 2); U.dot(E, xe, 0, M.drip, 3); U.dot(E, xe + 1, 0, M.drip, 2); }
      else { U.dot(E, xe, y1 + 1, M.drip, 4); U.dot(E, xe, y1 + 2, M.drip, 3); }
    }
  }
  // 候选部件：slimeEggSac（半透明粘液卵囊腹）—— 膜（band 2）+ 下部沉淀的隔点暗纹 + 3 只蜷着的小蜘蛛暗影（sh 乱动）+ 2 颗气泡 + 左上一道高光；
  //   sq = 腹尖一挤（后端收、腹尖吐丝口张开）；pop = 撑破瘪成一张皮，上沿锯齿、两片翻起的膜
  const SHAD = [[-4, -1], [1, -3], [-1, 2]], JIT = [[0, 0], [1, -1], [-1, 0], [0, 1]];
  function sac(s) {
    E.part();
    const cx = s.cx, cy = s.cy, rx = s.rx, ry = s.ry;
    if (P.pop) {
      const fy = -1.8, frx = rx * 0.95;
      U.oval(E, cx, fy, frx, 1.8, M.sac, 0);
      for (let x = R(cx - frx); x <= R(cx + frx); x++) if ((x & 1) === 0) U.dot(E, x, R(fy - 2.3), M.sac, 2);   // 撕开的上沿
      U.dot(E, R(cx - 3), R(fy - 3), M.sac, 4); U.dot(E, R(cx - 3), R(fy - 4), M.sac, 3); U.dot(E, R(cx + 2), R(fy - 3), M.sac, 3);   // 翻起的膜
      for (const x of [-5, -1, 3]) U.dot(E, R(cx + x), -1, M.sac, 1);                                                                  // 瘪下去的小蜘蛛残影
      return;
    }
    U.oval(E, cx, cy, rx, ry, M.sac, 0);
    for (let y = R(cy + ry * 0.35); y <= R(cy + ry) - 1; y++) for (let x = R(cx - rx) + 2; x <= R(cx + rx) - 2; x++) {   // 沉淀：下部隔点暗纹
      const u = (x - cx) / rx, v = (y - cy) / ry; if (u * u + v * v < 0.62 && ((x + y) & 1) === 0) U.dot(E, x, y, M.sac, 2);
    }
    SHAD.forEach(([dx, dy], k) => {                                                // 蜷着的小蜘蛛暗影：3×2 身 + 4 条腿
      const j = JIT[(P.sh + k) & 3], x = R(cx + dx * (rx / 8) + (P.sh ? j[0] : 0)), y = R(cy + dy * (ry / 6.5) + (P.sh ? j[1] : 0));
      for (let i = 0; i < 3; i++) { U.dot(E, x + i, y, M.sac, 1); U.dot(E, x + i, y - 1, M.sac, 1); }
      const lg = (P.sh + k) & 1;
      U.dot(E, x - 1, y - 2 + lg, M.sac, 2); U.dot(E, x + 3, y - 2 + (1 - lg), M.sac, 2); U.dot(E, x - 1, y + 1, M.sac, 2); U.dot(E, x + 3, y + 1, M.sac, 2);
    });
    U.dot(E, R(cx + rx * 0.45), R(cy - ry * 0.2), M.sac, 4); U.dot(E, R(cx - rx * 0.1), R(cy + ry * 0.25), M.sac, 4);   // 气泡
    for (let k = 0; k < 5; k++) { const a = Math.PI * (1.12 + k * 0.08), x = R(cx + Math.cos(a) * rx * 0.72), y = R(cy + Math.sin(a) * ry * 0.72); U.dot(E, x, y, k === 2 ? M.spec : M.sac, 4); }   // 左上高光
    const tx = R(cx - rx), ty = R(cy + ry * 0.35);                                  // 腹尖吐丝口
    U.dot(E, tx, ty, M.sac, 1); if (P.sq) { U.dot(E, tx - 1, ty, M.sac, 2); U.dot(E, tx - 1, ty + 1, M.sac, 1); }
  }
  function cephalo() {
    const T = rig.T, Hd = rig.Hd, s = sacGeo();
    E.part();
    U.oval(E, T.x, T.y, T.rx, T.ry, M.shell, 0);
    if (!rig.lie) U.seg(E, T.x - 1, T.y - 1, s.cx + s.rx * 0.5, R(s.cy + s.ry * 0.8), 1, M.shell, 0);   // 腹柄（接到卵囊前下沿）
    U.dot(E, T.x - 1, T.y + 1, M.shell, 2); U.dot(E, T.x + 1, T.y + 1, M.shell, 2);   // 头胸下的凹纹
    E.part();
    U.oval(E, Hd.x, Hd.y, Hd.rx, Hd.ry, M.shell, 0);
    const ex = R(Hd.x) - 2, ey = R(Hd.y - Hd.ry) + 1, em = P.eg ? M.eyeG : M.eye;     // 8 只小眼排成一排（侧看露出 5 只，亮暗相间）
    for (let k = 0; k < 5; k++) U.dot(E, ex + k, ey + (k === 4 ? 1 : 0), em, (k & 1) ? 3 : 4);
  }
  // 候选部件：sewerCap（烂草 + 锈铁瓶盖小帽）—— 瓶盖是 4×2 的 iron 基色块、顶边 1 格亮，坐在头胸背线上（和眼排之间隔 1 行）；
  //   3 根苔绿亮段的烂草叶从瓶盖后面伸出轮廓（平涂、先画，瓶盖顶边不被草压出分界线；草尖随 bob 摆）；at = [x, y] 时画成掉在地上的瓶盖（侧翻，压边一条 + 顶面一格）
  function grass() {
    const T = rig.T, x = R(T.x) - 2, y = R(T.y - T.ry) - 2, sw = P.bob ? 1 : 0;   // y = 瓶盖顶行
    E.part();
    U.dot(E, x, y - 1, M.grass, 3); U.dot(E, x - 1, y - 2, M.grass, 3); U.dot(E, x - 1 - sw, y - 3, M.grass, 4);   // 后叶：往后倒
    U.dot(E, x + 2, y - 1, M.grass, 3); U.dot(E, x + 2 + sw, y - 2, M.grass, 4);                                     // 中叶：直立
    U.dot(E, x + 4, y + 1, M.grass, 3); U.dot(E, x + 5, y, M.grass, 4);                                             // 前叶：从瓶盖前沿斜伸出去
  }
  function cap(at) {
    E.part();
    if (at) { const [x, y] = at; for (let i = 0; i < 4; i++) U.dot(E, x + i, y, M.cap, 3); U.dot(E, x + 1, y - 1, M.cap, 4); U.dot(E, x + 2, y - 1, M.cap, 4); U.dot(E, x + 3, y, M.rust, 3); return; }
    const T = rig.T, x = R(T.x) - 2, y = R(T.y - T.ry) - 1;                       // 底行贴着头胸背线
    for (let i = 0; i < 4; i++) { U.dot(E, x + i, y, M.cap, 3); U.dot(E, x + i, y - 1, M.cap, 4); }   // 基色块 + 1 格亮顶边
    U.dot(E, x + 3, y, M.rust, 3);                                                // 一点锈
  }
  // 螯牙：头前一对往下勾的毒牙（近侧亮、远侧暗一级），jaw 张开时前后分开，牙尖骨白
  function fangs() {
    E.part(); const Hd = rig.Hd, x = R(Hd.x + Hd.rx - 1), y = R(Hd.y + Hd.ry * 0.5), j = P.jaw | 0;
    U.dot(E, x - 1, y + 1, M.fang, 1); U.dot(E, x - 1 - (j >> 1), y + 2, M.tip, 2);
    U.dot(E, x, y + 1, M.fang, 0); U.dot(E, x + (j ? 1 : 0), y + 2, M.fang, 0); U.dot(E, x + j, y + 3, M.tip, 4);
  }
  // 候选部件：legSide（一侧的细腿并成一个部件）—— 同侧四条腿之间不压分界线；上段基色、下段亮色，都是 1 格细线；远侧腿紧贴在近侧腿后上方 1 格（读成一条双色腿），足尖骨色，
  //   腿的勾线用比基色暗一级的色，不用墨黑，夜空里也读得出 4 道 ∧；近侧 / 远侧之间照常有分界线
  function legSide(far) {
    E.part(); const mat = far ? LEG_F : LEG_N;
    for (const L of rig.legs) {
      if (!!L.far !== !!far) continue;
      U.seg(E, L.B[0], L.B[1], L.K[0], L.K[1], 1, mat, 3);
      U.seg(E, L.K[0], L.K[1], L.F[0], L.F[1], 1, mat, 4);
      U.dot(E, L.K[0], L.K[1], mat, 4); U.dot(E, L.F[0], L.F[1], far ? mat : m.claw, far ? 3 : 2);
    }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const s = sacGeo();
    if (!P.pop) drips(s);
    legSide(1); legSide(0);
    sac(s);
    cephalo();
    if (!P.drop) { grass(); cap(null); }
    fangs();
    if (P.drop) cap([R(rig.T.x) - 1 + P.dsx, -1 - P.dsy]);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const BALL_T = T_LAND, LAND_X = HX + 8;                                          // 粘液球 0 → T_LAND 秒抛物线落到身前 8 格（假人脚下）
  let ballT = 9, ballX0 = 0, ballY0 = 0, slT = 9, slX = 0, slWhite = 0, deathSl = 9, dsX = 0, lastGf = -9, dropAcc = 0, chargeAcc = 0, soulAcc = 0, biteT = 9, biteX = 0, biteY = 0;
  const sacScr = () => [scrX(P.gx), HY + P.gy];
  function ballPos(t) { const q = clamp01(t / BALL_T); return [R(ballX0 + (LAND_X - ballX0) * q), R(ballY0 + (FLOOR - 4 - ballY0) * q - 26 * 4 * q * (1 - q))]; }
  function onEnter(s) {
    if (s === CAST) {                                                               // 腹尖一挤：汇聚的水滴外爆，粘液球从腹尖吐出，抛物线越过背
      poseAt(CAST, 0, E.simT); const [sx, sy] = sacScr(), g = sacGeo();
      releaseOrbit(30, 80, 0.3, 0.6, { pts: 1, kind: K_PHYS, g: 150, floor: FLOOR - 1 }); burst(sx, sy, 14, 30, 80, 0.2, 0.45, R_EL, 10); ring(sx, sy, 0, R_EL);
      ballT = 0; ballX0 = scrX(R(g.cx - g.rx) + P.bx); ballY0 = HY + R(g.cy + g.ry * 0.35);
      sfx('shoot', { proj: 'water' }); shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                              // 螯牙一合：两道小咬合弧 + 火花 + 几滴粘液
      const mx = scrX(rig.mouth[0] + P.bx) + 1, my = HY + rig.mouth[1] + 1; biteT = 0; biteX = mx; biteY = my;
      burst(mx + 2, my, 8, 30, 80, 0.12, 0.3, FXI.impact, 6);
      for (let i = 0; i < 5; i++) spawnX(K_PHYS, mx + 1, my, 10 + Math.random() * 40, -20 - Math.random() * 30, 0.4 + Math.random() * 0.2, R_EL, { g: 220, floor: FLOOR - 1 });
      hitDummy(0, 1); sfx('swing', { kind: 'bite', w: 0.4 }); sfx('hit', { mat: 'flesh', w: 0.4 });
    }
    if (s === CAST && t === T_LAND) {                                               // 粘液球落地啪地溅开：溅液外爆 + 地面小法阵
      for (let i = 0; i < 18; i++) spawnX(K_PHYS, LAND_X + (Math.random() - 0.5) * 4, FLOOR - 3, (Math.random() - 0.5) * 80, -30 - Math.random() * 50, 0.5 + Math.random() * 0.35, R_EL, { g: 240, floor: FLOOR - 1 });
      fx.circle(LAND_X, FLOOR - 1, 8, 2.5, R_EL, 1.0, 1, 0); burst(LAND_X, FLOOR - 3, 8, 20, 50, 0.15, 0.35, R_EL, 6);
      slT = 0; slX = LAND_X; shake(0.12, 1); sfx('impact', { pal: 'water', w: 0.45 });
    }
    if (s === CAST && t === T_POP) {                                                // 小蜘蛛剪影爬出法阵：闪白 + 小冲击环
      ring(slX, FLOOR - 3, 0, R_EL); fx.cross(slX, FLOOR - 4, 4, R_EL, 0.2); slWhite = 2 / 12;
      sfx('impact', { pal: 'water', w: 0.3 });
    }
    if (s === HURT && t === INCOMING) {                                             // 卵囊被打得一晃，溅出几滴粘液
      const [sx, sy] = sacScr(); for (let i = 0; i < 6; i++) spawnX(K_PHYS, sx, sy, (Math.random() - 0.7) * 50, -20 - Math.random() * 30, 0.45, R_EL, { g: 220, floor: FLOOR - 1 });
    }
    if (s === DEATH && t === T_BURST) {                                             // 腹囊撑破：污泥大重力溅开
      const [sx, sy] = sacScr();
      for (let i = 0; i < 28; i++) spawnX(K_PHYS, sx + (Math.random() - 0.5) * 8, sy - 2 + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 110, -30 - Math.random() * 70, 0.6 + Math.random() * 0.5, R_SLUDGE, { g: 260, floor: FLOOR - 1 });
      ring(sx, sy, 0, R_SLUDGE); shake(0.16, 2); sfx('impact', { pal: 'water', w: 0.35 });
    }
    if (s === DEATH && t === T_MELT) {                                              // 身体摊平融掉：把当前帧交给死亡套件
      drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('melt', { fadeAt: 1.15, fadeDur: 0.6 });
      for (let i = 0; i < 10; i++) spawn(K_DUST, HX - 14 + Math.random() * 24, HY - 1, (Math.random() - 0.5) * 24, -4 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust);
      deathSl = 0; dsX = scrX(-8 + P.bx); shake(0.1, 1); sfx('fall', { w: 0.35 });
    }
  }
  const EVENTS = [[], [], [T_HIT], [], [T_LAND, T_POP], [], [INCOMING], [T_BURST, T_MELT], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > 0.15) {                                          // 四周的浑水滴定点汇聚到卵囊上
      const [sx, sy] = sacScr(); chargeAcc += dt * (14 + 18 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 13 + Math.random() * 9, a = Math.random() * 6.2832; spawnX(K_SPIRAL_PT, sx, sy, (r - 3) / (0.4 + Math.random() * 0.3), 0, 9, R_MURK, { a, r, w: 4 + Math.random() * 2, tx: sx, ty: sy, orbitR: 3, orbitW: -7, squash: 0.7 }); }
    }
    if (state === CHARGE && stT > 1.0 && Math.random() < dt * 10) { const [sx, sy] = sacScr(); spawnX(K_PHYS, sx + (Math.random() - 0.5) * 10, sy + 6, 0, 0, 0.5, R_EL, { g: 120, floor: FLOOR - 1 }); }   // 胀到快撑破，往下滴
    if (state === MOVE && P.gf !== lastGf) {                                        // 每 2 帧（每个步态帧）掉一滴污泥；接触帧八足咔嗒
      const g = sacGeo(), u = DRIP[P.gf % 3][0], x = scrX(R(g.cx + u) + P.bx);
      spawnX(K_PHYS, x, HY - 2, 0, 10, 0.45, R_SLUDGE, { g: 120, floor: FLOOR - 1, age0: 0.2 });
      if (P.gf === 0 || P.gf === 2) sfx('step', { w: 0.3 });
      lastGf = P.gf;
    }
    if (state === IDLE) { dropAcc += dt * 0.8; while (dropAcc >= 1) { dropAcc -= 1; const g = sacGeo(); spawnX(K_PHYS, scrX(R(g.cx) + 3 + P.bx), HY - 3, 0, 6, 0.5, R_SLUDGE, { g: 100, floor: FLOOR - 1, age0: 0.2 }); } }
    if (state === DEATH && stT > INCOMING + 1.5 && stT < INCOMING + 2.4) {        // 泥洼上魂光飘升
      soulAcc += dt * 14; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 24, HY - 1 - Math.random() * 3, (Math.random() - 0.5) * 6, -12 - Math.random() * 12, 0.8 + Math.random() * 0.6, FXI.soul); }
    }
    ballT += dt; slT += dt; slWhite -= dt; deathSl += dt; biteT += dt;
    if (state === CAST && ballT < BALL_T && Math.random() < dt * 30) { const [bx, by] = ballPos(ballT); spawnX(K_PHYS, bx, by + 3, 0, 0, 0.35, R_EL, { g: 160, floor: FLOOR - 1 }); }   // 粘液球一路滴液
  }
  function fxReset() { ballT = 9; slT = 9; slWhite = 0; deathSl = 9; lastGf = -9; dropAcc = 0; chargeAcc = 0; soulAcc = 0; biteT = 9; }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  // 小蜘蛛剪影（和蛛母同一套下水道色）：9×5，腹是一颗小粘液球（后），头胸 + 黄绿眼 + 骨白牙尖（前）；rise 还埋在地下的行数、white 闪白、wf 腿换帧、fade 抖动消失 0–1
  function spiderling(x, rise, white, wf, fade) {
    const px = (dx, dy, c) => { const X = x + dx, Y = HY + dy + rise; if (Y > HY || bayer(X, Y) < fade) return; put(X, Y, white ? 21 : c); };
    const sk = SILT, sl = SLIME;
    px(-3, -4, sl[3]); px(-2, -4, sl[2]); px(-1, -4, sl[2]);                                  // 粘液腹
    px(-4, -3, sl[3]); px(-3, -3, 21); px(-2, -3, sl[2]); px(-1, -3, sl[2]); px(0, -3, sl[1]);
    px(-4, -2, sl[2]); px(-3, -2, sl[1]); px(-2, -2, sl[1]); px(-1, -2, sl[1]);
    px(1, -3, sk[3]); px(2, -3, sk[3]); px(3, -3, 50);                                        // 头胸 + 眼
    px(0, -2, sk[2]); px(1, -2, sk[2]); px(2, -2, sk[2]); px(3, -2, sk[3]); px(4, -2, 6);    // 牙尖
    for (const dx of wf ? [-3, -1, 1, 3] : [-4, -2, 2, 4]) { px(dx, -1, sk[3]); px(dx + (dx < 0 ? -1 : 1), 0, sk[2]); }
  }
  function fxFront(f12) {
    if (ballT < BALL_T) {                                                           // 6×6 粘液球（左上亮、右下暗、白高光）
      const [bx, by] = ballPos(ballT), W6 = [2, 4, 6, 6, 4, 2];
      for (let j = 0; j < 6; j++) for (let i = 0; i < W6[j]; i++) { const x = bx - W6[j] / 2 + i, y = by - 3 + j, e = i + j; put(x, y, e <= 2 ? EL[1] : e >= 8 ? EL[3] : EL[2]); }
      put(bx - 1, by - 2, 21);
    }
    if (slT < 1.15) {                                                               // 小蜘蛛从法阵里爬出来（先埋在地下，一行行冒出），闪白，再往前爬几步
      const t = slT - (T_POP - T_LAND), rise = Math.max(0, 5 - R(slT * 48)), walk = t > 0.2 ? Math.min(3, R((t - 0.2) * 10)) : 0;
      spiderling(slX + walk, rise, slWhite > 0, walk ? (f12 >> 1) & 1 : 0, slT > 0.85 ? (slT - 0.85) / 0.3 : 0);
    }
    if (deathSl < 2.2) {                                                            // 死亡：小蜘蛛从污泥里爬出来，往前爬，最后随消散淡去
      const t = deathSl - 0.05, rise = Math.max(0, 5 - R(t * 20)), walk = t > 0.35 ? Math.min(20, R((t - 0.35) * 16)) : 0;
      if (t >= 0) spiderling(dsX + walk, rise, t >= 0.2 && t < 0.2 + 2 / 12, walk ? (f12 >> 1) & 1 : 0, deathSl > 1.5 ? (deathSl - 1.5) / 0.55 : 0);
    }
    if (biteT < 2 / 12) {                                                           // 咬合弧：上下两道小弧往中间合
      const c = biteT < 1 / 12 ? EL[0] : EL[2], r = biteT < 1 / 12 ? 3 : 2;
      for (let k = 0; k <= 3; k++) { if (biteT >= 1 / 12 && (k & 1)) continue; const a = k / 3 * 1.2; put(biteX + 1 + R(Math.sin(a) * r), biteY - 1 - R(Math.cos(a) * r), c); put(biteX + 1 + R(Math.sin(a) * r), biteY + 1 + R(Math.cos(a) * r), c); }
    }
  }

  return {
    name: '蛛母', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eyeG], HIT_POINT, EVENTS,
    deathKit: { mode: 'melt', at: T_MELT },
    REVIVE: { dy: -9, ramp: 'water' },
    SFX: { body: 'beast', how: 'dissolve', pal: 'water', style: 'summon', w: 0.45 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
