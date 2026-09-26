// 绿魔（部队 · 兽人 · 先锋 · 史诗）：巨魔升级的另一支——骄傲的独裁者。巨型倒三角身形：宽肩厚胸、收腰、腿粗而直，下巴抬高、完全不驼背；
// 巨魔的三件识别特征全部放大：前臂骨板长成一面从肩到膝的骨质塔盾（几块骨板拼合、苔绿骨缝、边缘骨刺、盾心凸起一颗兽头骨），
// 背脊骨刺往上长成围在后脑的一圈骨刺领（像王座靠背），头顶一圈 4 个骨尖的冠 + 向外卷的巨獠牙，保留后掠长耳；
// 墨翠绿的皮肤，两肩覆骨板鳞甲，兽骨腰带挂着小头骨。攻击 = 双手举盾、用盾底边向前下方猛砸；
// 技能 = 特性「统治」生效：独自顶盾时砸地升起骨翠点阵护罩、弹开敌弹；但紧挨着的强力友军那一侧护罩会裂开（防御高，但容不下强者）。
PCD.define('GreenDemon', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, fxRamp,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_BURST, K_SPIRAL_PT,
    spawn, spawnX, burst, shoot, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, allyFx, sfx } = E;
  const RD = Math.round, FREE = parts.FREE;

  // ───── 元素：统治 · 骨白苔绿（沿用巨魔的色阶：白 → 骨白 → 淡苔 → 苔绿 → 墨绿）─────
  const R_EL = fxRamp('boneMoss', [21, 17, '#b4d88a', 36, 34]), EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    skin: { r: 'green', band: 2 }, leg: 'green',                  // 墨翠绿皮（主材质，大面积 band 2）；腿单独一个材质，不吃轮廓光
    bone: 'bone', spike: [8, 7, 7, 6],                              // 骨塔盾 / 冠 / 獠牙 / 鳞甲；骨刺领在头后面，暗一级
    hide: [20, 20, 19, 32],
    seam: { r: [34, 34, 36, '#b4d88a'], flat: 1 },                 // 苔绿骨缝（发光体）
    eye: { r: [34, 34, 17, 21], flat: 1 },                         // 骨白的怒眼（施放时闪白、死后变暗）
    socket: { r: [0, 0, 8, 8], flat: 1 },
    mouth: [55, 55, 56, 57],
  });
  const BODY = { body: 'giant', torso: 12, head: 7, headW: 7, hunch: 0, sw: 6, waist: 2, belly: -1, limb: 1.4, lw: 4, stride: 4, fall: 'back' };
  const HX = 72, DUR = DEFAULT_DUR.slice(), ALLY_X = [HX - 22];
  const hero = new Sprite(104, 66, 56, 58);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 14], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['seam', 'eye', 'socket', 'leg', 'hide', 'mouth', 'skin', 'spike']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 骨塔盾（hx hy：盾的握点，盾的左上角在 hx − 1, hy − 9），后手空拳（bhx bhy）─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, sway: 0, chin: 0, side: 0, snort: 0,
    seam: 0, collar: 0, sq: 0, eyes: 0, flash: 0, lying: 0, lift: 0, crX: 0, crY: 0, crQ: 0, mouth: 0,
    gem: 0, rim: 0, dq: 0, dqk: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(8, -15, -7, -11);                            // 骨塔盾立在身前（从肩到膝），后手空拳垂在身后
  const K_LIFT = K(9, -22, 5, -19, -1, 0, 1);                   // 双手把盾举到胸高
  const K_SMASH = K(12, -9, 7, -13, 1, 1, 2);                   // 盾底边向前下方猛砸
  const K_HOLD = K(11, -10, 6, -13, 1, 0, 2);
  const K_RAISE = K(9, -24, 5, -21, -1, 0, 0);                  // 蓄力：盾举过胸
  const K_SLAM = K(9, -9, 5, -13, 1, 0, 3);                     // 施放：盾底砸地
  const K_HURT = K(6, -15, -8, -12, -1, -1);
  const K_SWAY = K(7, -15, -8, -12, -1, 0);
  const K_LIE = K(4, -12, -6, -10, 0, 0, 0);
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = E.keyer([['hx', -32, 31], ['hy', -48, 15], ['bhx', -32, 31], ['bhy', -48, 15], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['chin', 0, 1], ['side', 0, 1], ['snort', 0, 1], ['seam', 0, 5], ['collar', 0, 5], ['sq', 0, 4],
    ['eyes', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3], ['crX', -24, 8], ['crY', -8, 4], ['crQ', 0, 3], ['mouth', 0, 1],
    ['gem', 0, 4], ['rim', 0, 3], ['dqk', 0, 48], ['bx', -16, 15], ['st', 0, 8]]);
  const SWAY_IDLE = [0, 1, 0, -1];
  const T_SMASH = 2 / 12, T_HIT = 0.2, T_LAND = INCOMING + 0.66, T_SLAP = INCOMING + 0.92;
  // 待机个性（1.6–2.0 s）：抬下巴斜眼俯视 → 鼻孔喷气 → 盾提起 → 盾底在地上顿一下
  const PROUD = [[1, 1, 0, 0], [1, 1, 1, 0], [1, 0, 0, -2], [1, 0, 0, 6], [0, 0, 0, 2]];   // chin, side, snort, 盾的上下（第 4 帧盾底落到地面）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.sway = 0; P.chin = 0; P.side = 0; P.snort = 0; P.seam = 1; P.collar = 0; P.sq = 0; P.eyes = 0; P.flash = 0;
    P.lying = 0; P.lift = 0; P.crX = 0; P.crY = 0; P.crQ = 0; P.mouth = 0; P.gem = 0; P.rim = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3]; P.chin = 1;
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) { const k = PROUD[Math.floor((lp - 1.6) * 12 + 1e-6)]; P.chin = k[0]; P.side = k[1]; P.snort = k[2]; P.hy += k[3]; P.bob = 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 昂首阔步：上身几乎不晃（只在接触帧沉 1 格），盾稳在身前
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f); P.chin = 1; P.bhx -= P.step * 2; P.sway = -P.step;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                        // 双手举盾到胸高 → 盾底边向前下方猛砸
      if (tq < 0.12) { setK(K_IDLE, K_LIFT, ease.out(tq / 0.12)); P.mouth = 1; }
      else if (tq < 0.2) { setK(K_SMASH, K_SMASH, 0); P.bx = 2; P.mouth = 1; P.sway = -1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_SMASH, K_HOLD, q); P.bx = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(2 * (1 - q)); P.chin = q > 0.5 ? 1 : 0; }
    } else if (st === CHARGE) {                                        // 盾举过胸：骨缝逐条亮起、骨刺领一根根竖高；斜眼瞪一下身边的友军
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_RAISE, q); P.chin = 1;
      P.seam = 1 + Math.min(4, Math.floor(tq / 0.22 + 1e-6)); P.collar = Math.min(5, Math.floor(tq / 0.2 + 1e-6)); P.side = tq >= 0.5 && tq < 0.9 ? 1 : 0;
      P.rim = 2; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
    } else if (st === CAST) {                                          // 盾底砸地（定格 1 帧），护罩升起
      setK(K_RAISE, K_SLAM, ease.out(clamp01(tq / 0.1))); P.seam = 5; P.collar = 5; P.gem = 3; P.rim = tq < 0.2 ? 3 : 2; P.mouth = 1; P.chin = 1;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_SLAM, K_IDLE, q); P.chin = 1;
      P.seam = q < 0.35 ? 5 : q < 0.75 ? 3 : 1; P.collar = Math.max(0, 5 - Math.floor(q * 6 + 1e-6)); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -1; P.eyes = 1; P.mouth = 1; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; }
      else { setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15))); P.chin = 1; }
    } else if (st === DEATH) {                                         // 挺着 → 摇晃 → 像被砍倒的树直挺挺向后倒 → 塔盾脱手翻一圈拍在胸口 → 骨冠滚到脑后 → 骨缝逐条熄灭
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -1; P.eyes = 1; P.mouth = 1; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; }
      else if (d < 0.5) { setK(K_SWAY, K_SWAY, 0); P.bx = d < 0.4 ? 0 : -2; P.lean = d < 0.4 ? 1 : -1; P.eyes = 1; P.chin = 1; }
      else {
        setK(K_LIE, K_LIE, 0); P.lying = 1; P.bx = -2; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
        const sq = clamp01((d - 0.66) / 0.26);                         // 塔盾翻一圈（竖 → 横 → 侧边）拍在胸口
        P.sq = d < 0.66 ? 0 : sq < 0.34 ? 1 : sq < 0.67 ? 2 : sq < 1 ? 3 : 4;
        const cq = clamp01((d - 0.66) / 0.4); P.crX = RD(-6 * cq); P.crY = RD(-Math.sin(cq * Math.PI) * 3); P.crQ = Math.floor(cq * 3.99 + 1e-6) & 3;
        P.seam = d < 1.0 ? 5 : d < 1.12 ? 4 : d < 1.24 ? 3 : d < 1.36 ? 2 : d < 1.48 ? 1 : 0;
        P.gem = d < 1.0 ? 1 : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.side = 0; P.snort = 0; P.hy = K_IDLE.hy;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.gem = 1;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.lying) { const s = SH[P.sq]; P.gx = s[0] + (s[2] === 0 ? 4 : 9) + P.bx; P.gy = s[1] + (s[2] === 0 ? 8 : s[2] === 1 ? 4 : 0); }
    else { P.gx = P.hx + 3 + P.bx; P.gy = P.hy - 1; }                  // 发光体 = 盾心兽头骨（苔绿骨缝汇到这里）
    P.dqk = RD(P.dq * 48); KEY(P);
  }

  // ───── 画（部件从后往前）─────
  // 倒地时塔盾的位置（精灵本地坐标，左上角）和朝向：从手臂上脱落（还竖在原来的位置，人已经往后倒）→ 翻成横的 → 侧边 → 拍在胸口
  const SH = [[5, -22, 0], [-13, -21, 1], [-19, -17, 2], [-19, -14, 2], [-19, -12, 2]];
  let R = null, T = null;
  const px = (x, y, m, t) => parts.px(E, T || R, x, y, m, t), run = (y, a, b, m, t) => { for (let x = Math.round(a); x <= Math.round(b); x++) px(x, y, m, t); };
  const seamTone = (k) => (P.seam === 0 ? 1 : P.seam < k + 1 ? 2 : P.gem === 3 ? 4 : P.gem === 2 && (k & 1) ? 4 : 3);
  // 候选部件：boneTower —— 骨塔盾（9×18）：几块骨板拼合，苔绿骨缝 1–4 按 seam 逐条亮起；盾心凸起一颗兽头骨（眼窝、鼻孔、牙）；上沿 3 个骨尖、前沿一排骨刺
  // B 骨板（自动明暗）· h 亮边 · d 暗边 · 1–4 骨缝 · 兽头骨：x 头骨轮廓（最暗）· k 头骨面 · e 眼窝 · n 鼻孔 · t 牙
  const TOWER = ['.hBBBBBd.', 'hhBB1BBBd', 'hBBB1BBBd', 'hBBBB1BBd', 'hB22222Bd', 'BBxxxxxBd', 'BxkkkkkxB', 'BxkekekxB', 'BxkkkkkxB', 'BBxknkxBd',
    'BBxtktxBd', 'BBBxxxBBd', 'BB333BBBd', 'BBBBB33Bd', 'dBBBBB4Bd', 'dBBBBB4Bd', '.dBBBBBd.', '..ddddd..'];
  const TOWER_SP = [[1, -1], [4, -1], [4, -2], [7, -1], [9, 2], [9, 6], [9, 10], [9, 14], [-1, 5], [-1, 11]];
  function tower(cx, cy, q) {                                          // (cx, cy) = 盾的左上角格；q 0 竖 · 1 横（转 90°）· 2 侧边（平躺，看见一条）
    E.part();
    if (q === 2) {                                                     // 平躺在胸口：侧看一条 18×2，中间兽头骨凸起、两端骨尖
      for (let u = 0; u < 18; u++) { px(cx + u, cy, M.bone, u < 2 ? 4 : 0); px(cx + u, cy + 1, M.bone, 2); }
      px(cx + 8, cy - 1, M.bone, 4); px(cx + 9, cy - 1, M.bone, 0); px(cx + 10, cy - 1, M.bone, 0); px(cx + 9, cy - 2, M.bone, 4); px(cx + 1, cy - 1, M.bone, 3); px(cx + 16, cy - 1, M.bone, 3);
      for (let u = 3; u < 16; u += 4) px(cx + u, cy, M.seam, seamTone((u >> 2) & 3));
      return;
    }
    const at = (u, v) => (q === 1 ? [cx + 17 - v, cy + u] : [cx + u, cy + v]);
    for (let v = 0; v < TOWER.length; v++) for (let u = 0; u < 9; u++) {
      const ch = TOWER[v][u]; if (ch === '.') continue; const p = at(u, v);
      if (ch >= '1' && ch <= '4') px(p[0], p[1], M.seam, seamTone(+ch - 1));
      else if (ch === 'e' || ch === 'n') px(p[0], p[1], M.socket, ch === 'e' && P.gem === 3 ? 3 : 1);
      else px(p[0], p[1], M.bone, ch === 'h' || ch === 'k' || ch === 't' ? 4 : ch === 'x' ? 1 : ch === 'd' ? 2 : 0);
    }
    for (const [u, v] of TOWER_SP) { const p = at(u, v); px(p[0], p[1], M.bone, 4); }
  }
  // 候选部件：spineCrown —— 背脊骨刺往上长成围在后脑的一圈骨刺领（5 根扇形，像王座靠背；最高的一根高出头顶 4 格，尖和尖之间错开 2 格以上）；
  //   collar = 蓄力时竖高了几根（加长 2 格）
  const COLLAR = [[-4, 4, -10, -1], [-3, 1, -8, -7], [-1, -1, -4, -10], [1, -2, 0, -12], [3, -2, 3, -9]];   // 根部、尖端（相对后颈）
  function wedge(bx, by, tx, ty, w0, m) {
    const dx = tx - bx, dy = ty - by, L2 = dx * dx + dy * dy || 1, L = Math.sqrt(L2);
    const x0 = Math.floor(Math.min(bx, tx) - 2), x1 = Math.ceil(Math.max(bx, tx) + 2), y0 = Math.floor(Math.min(by, ty) - 2), y1 = Math.ceil(Math.max(by, ty) + 2);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = ((x - bx) * dx + (y - by) * dy) / L2; if (t < -0.1 || t > 1) continue;
      const d = Math.abs((x - bx) * dy - (y - by) * dx) / L; if (d > w0 * (1 - t) + 0.35) continue;
      px(x, y, m, t > 1 - 1.6 / L ? 4 : 0);
    }
  }
  function collarSpikes() {
    E.part(); const nx = R.hx0 - 2, ny = R.yS - 1;
    for (let k = 0; k < 5; k++) {
      const c = COLLAR[k], up = P.collar > k ? 1 : 0, ex = c[2] - c[0], ey = c[3] - c[1], el = Math.hypot(ex, ey), g = up ? 2 / el : 0;
      wedge(nx + c[0], ny + c[1], nx + c[2] + ex * g, ny + c[3] + ey * g, 1.0, M.spike);
    }
  }
  // 头：宽 9 的方下巴脸、厚眉骨压着发光的眼、塌鼻、前突的大下颌；向外卷的巨獠牙；chin 抬下巴、side 斜眼
  function head() {
    const x0 = R.hx0, top = R.htop - P.chin, sk = M.skin, c = (i) => x0 + i, r = (j) => top + j;
    E.part();
    run(r(0), c(1), c(5), sk, 0); run(r(1), c(0), c(6), sk, 0); run(r(2), c(0), c(7), sk, 0); run(r(3), c(0), c(6), sk, 0); run(r(4), c(0), c(7), sk, 0);
    run(r(5), c(1), c(7), sk, 0); run(r(6), c(2), c(8), sk, 0);
    px(c(1), r(0), sk, 4); px(c(5), r(2), sk, 4); px(c(6), r(2), sk, 4); px(c(7), r(2), sk, 4);   // 头顶高光 + 厚眉骨
    if (P.eyes) { px(c(4), r(3), sk, 1); px(c(5), r(3), sk, 1); }
    else { px(c(P.side ? 4 : 5), r(3), M.eye, P.gem === 3 ? 4 : P.gem === 4 ? 1 : 3); px(c(P.side ? 5 : 4), r(3), sk, 1); px(c(6), r(3), sk, 1); }
    px(c(7), r(4), sk, 3); px(c(6), r(4), sk, 1); px(c(3), r(4), sk, 2);   // 塌鼻头 + 鼻孔 + 颧骨阴影
    if (P.mouth) { px(c(4), r(5), M.mouth, 1); px(c(5), r(5), M.mouth, 2); px(c(6), r(5), M.mouth, 2); px(c(5), r(6), M.mouth, 1); px(c(6), r(6), M.bone, 4); }
    else { px(c(4), r(5), sk, 1); px(c(5), r(5), sk, 1); px(c(6), r(5), sk, 1); px(c(6), r(6), M.bone, 4); }   // 嘴线 + 下牙
    px(c(2), r(6), sk, 2); px(c(3), r(6), sk, 2);
    E.part();                                                          // 向外卷的巨獠牙：从下颌外角长出、往前上方卷
    px(c(8), r(5), M.bone, 2); px(c(9), r(5), M.bone, 3); px(c(9), r(4), M.bone, 3); px(c(9), r(3), M.bone, 4); px(c(10), r(2), M.bone, 4);
    E.part();                                                          // 后掠长耳（压在骨刺领前面）
    px(c(0), r(3), sk, 0); px(c(0), r(4), sk, 2); px(c(-1), r(3), sk, 0); px(c(-1), r(2), sk, 0); px(c(-2), r(2), sk, 0); px(c(-2), r(3), sk, 2); px(c(-3), r(1), sk, 0); px(c(-3), r(2), sk, 2); px(c(-4), r(0), sk, 0); px(c(-5), r(0), sk, 4);
  }
  // 骨冠：一圈骨箍 + 4 个骨尖（中间两根高）；箍正中一颗苔绿骨缝。倒地时滚到脑后（自由落笔，crQ 按 90° 翻滚）
  const CROWN = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [0, -1], [0, -2], [2, -1], [2, -2], [2, -3], [4, -1], [4, -2], [4, -3], [6, -1], [6, -2]];
  function crown(fx0, fy0, q) {
    E.part();
    for (const [u, v] of CROWN) { const a = [u - 3, v], b = q === 0 ? a : q === 1 ? [-a[1], a[0]] : q === 2 ? [-a[0], -a[1]] : [a[1], -a[0]]; px(fx0 + b[0], fy0 + b[1], M.bone, v <= -2 && (u === 2 || u === 4 ? v === -3 : true) ? 4 : v === 0 && (u & 1) ? 2 : 0); }
    px(fx0, fy0, M.seam, seamTone(0));
  }
  function shoulderScales(side) {                                      // 肩上的骨板鳞甲：三片骨板从肩头往下叠（每片下沿一道暗缝），肩头一根骨尖
    E.part(); const m = side === 'B' ? M.boneD : M.bone, sx = side === 'B' ? R.sBx : R.sFx, sy = side === 'B' ? R.sBy : R.sFy;
    run(sy - 3, sx - 1, sx + 1, m, 0); run(sy - 2, sx - 2, sx + 2, m, 0); run(sy - 1, sx - 3, sx + 2, m, 2);
    run(sy, sx - 3, sx + 3, m, 0); run(sy + 1, sx - 3, sx + 3, m, 2);
    run(sy + 2, sx - 2, sx + 3, m, 0); run(sy + 3, sx - 1, sx + 3, m, 2);
    px(sx, sy - 4, m, 0); px(sx - 1, sy - 5, m, 4);
  }
  function beltSkulls() {                                              // 兽骨腰带 + 两枚小头骨（被他压服的对手）+ 皮兜
    E.part(); const y = R.yHip - 1, e = parts.edges(R, y);
    for (let x = e[0]; x <= e[1]; x++) px(x, y, M.bone, (x & 1) ? 2 : 0);
    for (let k = 0; k < 4; k++) { const yy = R.yHip + k, s = k >= 2 ? P.sway : 0; run(yy, e[1] - 4 + s + (k >> 1), e[1] - 1 + s, M.hide, 0); }
    for (let k = 0; k < 2; k++) { const yy = R.yHip + k; run(yy, e[0] - (k ? P.sway : 0), e[0] + 2 - (k ? P.sway : 0), M.hide, 0); }
    E.part();
    for (const sx of [e[1] - 6, e[0] + 3]) { run(y + 1, sx - 1, sx + 1, M.bone, 0); px(sx - 1, y + 2, M.socket, 1); px(sx, y + 2, M.bone, 3); px(sx + 1, y + 2, M.socket, 1); px(sx, y + 3, M.bone, 2); px(sx - 1, y + 1, M.bone, 4); }
  }
  function drawHero() {
    E.begin(hero, P.bx, 0); R = parts.rig(P, BODY); T = null;
    parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.skinD, hand: M.skinD, grip: 'big' });
    if (!R.lie) shoulderScales('B');
    parts.legs(E, R, P, { style: 'bare', mat: M.leg, matD: M.legD });
    if (!R.lie) { E.part(); px(R.footFx + 3, -R.footFup, M.bone, 3); px(R.footFx + 4, -R.footFup, M.bone, 4); px(R.footBx + 2, -R.footBup, M.boneD, 3); }
    parts.torso(E, R, P, { style: 'bare', mat: M.skin });
    beltSkulls();
    collarSpikes();                                                    // 骨刺领从后颈长出来：压在背上，在头和耳朵后面（倒地时跟着身体转，压在身下的部分不画）
    head();
    if (!R.lie) crown(R.hx, R.htop - P.chin - 1, 0);
    parts.arm(E, R, P, { sleeve: 'bare', mat: M.skin, grip: 'none', cuff: M.bone, cuffStyle: 'bracer' });
    shoulderScales('F');
    if (!R.lie) { tower(P.hx - 1, P.hy - 9, 0); parts.hand(E, R, P, { hand: M.skin, grip: 'big' }); }
    else {                                                             // 倒地：骨冠滚到脑后、塔盾脱手翻一圈拍在胸口（自由落笔，不跟身体转）
      T = FREE; const hd = parts.toSprite(R, R.hx, R.htop - 1); crown(hd[0] - 2 + P.crX, Math.min(-1, hd[1] + P.crY), P.crQ);
      const sh = SH[P.sq]; tower(sh[0], sh[1], sh[2]);
      T = null;
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let smashT = 9, domeT = 9, crackT = 9, hitT = 9, chargeAcc = 0, soulAcc = 0, lastStep = 0, lastSn = 0, lastThump = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const DOME_CX = () => HX + 3, DOME_RX = 19, DOME_RY = 40, DOME_N = 40;
  function onEnter(s) {
    if (s === CAST) {
      domeT = 0; crackT = 9; hitT = 9; const x = wx(P.hx + 3);
      fx.crack(x + 4, HY + 1, 8, 1, R_EL, 1.0); fx.crack(x - 4, HY + 1, 8, -1, R_EL, 1.0);
      burst(x, HY - 2, 24, 50, 120, 0.3, 0.7, R_EL, 30); burst(x, HY - 1, 12, 20, 50, 0.3, 0.5, FXI.dust, 12); E.releaseOrbit(40, 90, 0.3, 0.6, { pts: 1 });
      shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'nature', w: 0.9 });
    }
  }
  function onTime(s, t) {
    if (s === CHARGE && Math.abs(t - 0.5) < 1e-9) allyFx({ dur: 0.4, outline: FXI.dust });   // 斜眼一瞪：身边的友军被瞪得一僵
    if (s === ATTACK && t === T_SMASH) {                               // 盾底边砸下：竖直拖影 + 落点小地裂 + 尘
      smashT = 0; const x = Math.min(wx(P.hx + 6), DUMMY_X - 3);
      hitDummy(1); burst(x, HY - 6, 14, 40, 100, 0.15, 0.4, R_IMP, 12); fx.crack(x, HY + 1, 6, 1, FXI.dust, 0.6); fx.crack(x - 1, HY + 1, 4, -1, FXI.dust, 0.6);
      for (let i = 0; i < 6; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 8, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4, FXI.dust);
      shake(0.1, 1); sfx('swing', { kind: 'smash', w: 0.8 }); sfx('hit', { mat: 'stone', w: 0.8 });
    }
    if (s === CAST && Math.abs(t - 0.05) < 1e-9) shoot(3, 150, HY - 16, -330, DOME_CX() + DOME_RX, FXI.enemy);   // 来袭敌弹
    if (s === CAST && Math.abs(t - T_HIT) < 1e-9) {                    // 敌弹撞上护罩、被弹开碎成苔绿火花；靠友军那一侧护罩同时裂开
      hitT = 0; crackT = 0; const x = DOME_CX() + DOME_RX, y = HY - 16;
      fx.cross(x, y, 5, R_EL, 0.25); burst(x, y, 16, 30, 90, 0.2, 0.5, R_EL, 8); burst(x, y, 5, 20, 50, 0.1, 0.25, FXI.enemy, 0);
      for (let i = 0; i < 6; i++) spawn(K_BURST, x, y, 30 + Math.random() * 40, -30 + Math.random() * 20, 0.5, R_EL);
      const cx = DOME_CX() - DOME_RX + 1; burst(cx, HY - 16, 8, 10, 40, 0.3, 0.6, FXI.dust, 4);
      shake(0.12, 1); sfx('hit', { mat: 'stone', w: 0.5 }); sfx('impact', { pal: 'nature', w: 0.5 });
    }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) { for (let i = 0; i < 20; i++) spawn(K_DUST, HX - 38 + Math.random() * 46, HY - 1, (Math.random() - 0.5) * 34, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.12, 1); sfx('fall', { w: 0.9 }); }
    if (s === DEATH && Math.abs(t - T_SLAP) < 1e-9) { for (let i = 0; i < 8; i++) spawn(K_DUST, HX - 20 + Math.random() * 18, HY - 8, (Math.random() - 0.5) * 24, -6 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust); sfx('hit', { mat: 'stone', w: 0.5 }); }
  }
  const EVENTS = [[], [], [T_SMASH], [0.5], [0.05, T_HIT], [], [], [T_LAND, T_SLAP], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                            // 骨白碎片从地上被螺旋吸向盾心头骨
      chargeAcc += dt * (22 + 36 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 13 + Math.random() * 10, a = 0.3 + Math.random() * (Math.PI - 0.6); spawnX(K_SPIRAL_PT, wx(P.gx - P.bx + 1), wy(P.gy), r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 5 + Math.random() * 3 }); }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.8 }); for (let i = 0; i < 3; i++) spawn(K_DUST, wx(P.step > 0 ? 6 : -5) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 20, -4 - Math.random() * 7, 0.3 + Math.random() * 0.3, FXI.dust); } lastStep = P.step; }
    if (state === IDLE) {
      if (P.snort !== lastSn) { if (P.snort) { const r0 = parts.rig(P, BODY); for (let i = 0; i < 3; i++) spawn(K_DUST, wx(r0.hx0 + 8), wy(r0.htop + 4 - P.chin), 10 + Math.random() * 10, 2 + Math.random() * 4, 0.35, FXI.dust); } lastSn = P.snort; }
      const th = P.hy - K_IDLE.hy - P.bob >= 3 ? 1 : 0; if (th !== lastThump) { if (th) for (let i = 0; i < 2; i++) spawn(K_DUST, wx(P.hx + 1 + i * 5), HY - 1, (i ? 1 : -1) * 12, -5, 0.35, FXI.dust); lastThump = th; }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 34 + Math.random() * 40, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    smashT += dt; domeT += dt; crackT += dt; hitT += dt;
  }
  function fxReset() { smashT = 9; domeT = 9; crackT = 9; hitT = 9; chargeAcc = 0; soulAcc = 0; lastStep = 0; lastSn = 0; lastThump = 0; }
  function fxBack(f12) { if (P.dq < 1 && !P.lying) floorGlow(wx(P.gx - P.bx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    if (smashT < 2 / 12) {                                             // 竖直砸击拖影（盾前沿上方落下的两道线）
      const x = wx(K_SMASH.hx + 8 + 2), c = smashT < 1 / 12 ? EL[1] : EL[2];
      for (let y = HY - 30; y < HY - 8; y++) { if (smashT >= 1 / 12 && (y & 1)) continue; put(x, y, y > HY - 14 ? EL[0] : c); put(x - 2, y + 3, EL[2]); }
    }
    const DUR_DOME = 0.5 + 0.7;                                        // 施放 + 收招
    if (domeT < DUR_DOME) {                                            // 骨翠点阵护罩：按角度从两侧地面逐点亮起到头顶，外圈骨白；收招时从外往里（两侧往头顶）逐点熄灭
      const cx = DOME_CX(), rise = clamp01(domeT / 0.2), gone = clamp01((domeT - 0.75) / 0.4);
      for (let k = 0; k <= DOME_N; k++) {
        const u = k / DOME_N, e = Math.min(u, 1 - u) * 2; if (e > rise || e < gone) continue;
        const a = Math.PI + u * Math.PI, x = RD(cx + Math.cos(a) * DOME_RX), y = RD(HY + Math.sin(a) * DOME_RY);
        const cracked = crackT < 1.0 && x < cx && Math.abs(y - (HY - 16)) <= 4;            // 靠友军那一侧的裂口（3 格断开、变暗、断续）
        if (cracked && Math.abs(y - (HY - 16)) <= 2) continue;
        if (cracked && ((f12 + k) & 1)) continue;
        const hit = hitT < 1 / 12 && x > cx && Math.abs(y - (HY - 16)) < 6;
        put(x, y, domeT < 1 / 12 || hit ? EL[0] : cracked ? EL[4] : e > rise - 0.12 ? EL[0] : EL[1]);
        if (!cracked) put(RD(cx + Math.cos(a) * (DOME_RX - 2)), RD(HY + Math.sin(a) * (DOME_RY - 2)), hit ? EL[1] : (k & 1) ? EL[2] : EL[3]);
      }
      if (crackT < 1.0) {                                              // 裂纹：从裂口往上下各爬 2 格，再往里爬一道
        const x = RD(cx - DOME_RX * Math.cos(Math.asin(clamp01(16 / DOME_RY))));
        for (let j = -6; j <= 6; j++) if (Math.abs(j) >= 3) put(x + 1 + (Math.abs(j) & 1), HY - 16 + j, ((j + f12) & 1) ? EL[3] : EL[4]);
        for (let i = 0; i < 4; i++) put(x + 2 + i, HY - 16 + ((i & 1) ? 1 : -1), crackT < 1 / 12 ? EL[0] : EL[3]);
      }
    }
  }

  return {
    name: '绿魔', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.seam, M.eye], HIT_POINT: [2, -18], EVENTS, ALLIES: 'skill', ALLY_X,
    SFX: { body: 'armor', how: 'topple', pal: 'nature', style: 'shield', w: 0.9 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront,
  };
});
