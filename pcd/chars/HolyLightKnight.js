// 圣光骑士（部队 · 精灵 · 圣骑士 · 史诗 · batch-09）：赤卫（RedGuard.js）的成熟体——翅芽破茧，背后一对白金羽翼（翼尖残留赤卫的红布条），
// 同款护鼻尖盔 + 更长的红缨、盔后悬浮金色光环；银白鸢形圣盾（盾心十字圣徽发光）、叶形矛长成翼形金护手的圣光长枪。悬停不落地。
// 攻击 = 从空中斜下俯冲突刺（羽毛拖影）；技能 = 特性「超级细胞再生」：脚下金色十字法阵 → 光柱落在自己身上、羽翼猛扇 → 光柱里连续升起金色「＋」，旧伤痕化为金线消失。
PCD.define('HolyLightKnight', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_PHYS, K_SPIRAL_PT, K_BURST,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, groundShadow, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2, B = parts.beast;

  // ───── 元素：圣光 · 暖金白（holy：白 → 淡金白 → 金 → 暗金 → 棕）─────
  const R_EL = FXI.holy, EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    plate: [27, 29, 30, 31],                                       // 银白板甲（steel 亮段）
    silver: [28, 30, 31, 21],                                      // 盾面、枪刃
    gold: 'gold', skin: 'skin', wood: 'wood', crest: 'blood', tabard: 'crimson', belt: 'leather',
    fw: [61, 30, 21, 21],                                          // 白金羽翼·翼面 / 覆羽：白为主，暗面 steel 亮段，勾线暗金
    fp: [61, 62, 21, 21],                                          // 初级飞羽：白，暗侧 1/3 金
    fwF: [61, 30, 30, 5], fpF: [61, 62, 5, 5],                     // 远翼暗一级
    ribbon: [61, 57, 57, 58],                                      // 翼尖红布条（3a / 39 两级亮红，勾线用羽翼的暗金，不画暗红框）
    ink: { r: 'ink', flat: 1 },
    halo: { r: [61, 14, 5, 51], flat: 1 },                         // 悬浮光环（发光体）
    lit: { r: [14, 5, 51, 21], flat: 1 },                          // 盾心圣徽发光档、旧伤痕化成的金线
  });
  const BODY = { body: 'heroic', fall: 'front' }, BODY_LOOK = { body: 'heroic', fall: 'front', neck: -1 };   // 默祷：头低 1 格
  const SPEAR = { style: 'wing', hand: 'B', wood: M.wood, metal: M.silver, trim: M.gold, len: 12, back: 8 };
  const SPEAR_ATK = Object.assign({}, SPEAR, { back: 3 });
  const HX = 74, DUR = DEFAULT_DUR.slice(), ALT = 5;
  const hero = new Sprite(104, 72, 50, 66);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 22], rimRamp: EL, flash: 0, dq: 0, rimAll: 0, skip: new Uint8Array(256) };
  for (const k of ['wood', 'skin', 'ink', 'halo']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 鸢形圣盾，后手 = 圣光长枪；alt = 悬停高度，wing = 翼姿（B.WINGS 0–6）─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, alt: 0, wing: 0, halo: 0, scar: 0, aura: 0, shY: 0, spY: 0, drop: 0, look: 0,
    st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, ba, lean, head, crouch) => ({ hx, hy, bhx, bhy, ba, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(6, -11, 6, -17, 0, 0, 0, 1);                  // 祷告：长枪竖在胸前，盾垂在身侧
  const K_WIND = K(4, -12, 1, -19, 2.03, -1, 0, 0);              // 升高、枪尖斜指下方后引
  const K_DIVE = K(4, -9, 6, -17, 2.03, 1, 1, 0);                // 俯冲突刺
  const K_HOLD = K(5, -10, 5, -17, 2.03, 1, 0, 0);
  const K_CHARGE = K(8, -15, 3, -20, 0, -1, 0, 0);               // 羽翼张到最大、盾举起、枪竖起
  const K_CAST = K(8, -14, 4, -22, 0.2, 0, -1, 0);
  const K_HURT = K(4, -10, 4, -16, -0.3, -1, -1, 1);
  const K_FALL = K(3, -11, 2, -16, -0.5, -1, -1, 2);
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'ba', 'lean', 'head', 'crouch'];
  const setK = (A, B_, q) => E.mix(P, A, B_, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['bhx', -32, 31], ['bhy', -64, 15], ['ba', -32, 32, 1 / ASTEP], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['look', 0, 1]]);
  const KEY2 = parts.keyer([['alt', 0, 12], ['wing', 0, 6], ['halo', 0, 3], ['scar', 0, 3], ['aura', 0, 1], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['beard', -3, 3], ['sway', -2, 2], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['shY', 0, 24], ['spY', 0, 24], ['drop', 0, 3]]);
  const WING_IDLE = [4, 4, 2, 2, 4, 4], ALT_IDLE = [0, 0, 0, 1, 1, 0], WING_MOVE = [4, 1, 2, 3], ALT_MOVE = [0, -1, 0, 1], SWAY = [0, 1, 0, -1];
  const T_DIVE = 2 / 12, T_LAND = INCOMING + 8 / 12;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.dq = 0; P.flip = 0; P.mx = 0;
    P.alt = ALT; P.wing = 4; P.halo = 1; P.scar = 0; P.aura = 0; P.shY = 0; P.spY = 0; P.drop = 0; P.look = 0; P.bob = 0; P.step = 0; P.wup = 0; P.walk = 0;
    const idle = () => {                                               // 祷告：闭眼、羽翼缓扇、光环一亮一暗
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6) % 6; P.wing = WING_IDLE[b]; P.alt = ALT + ALT_IDLE[b]; P.beard = SWAY[(b + 1) & 3]; P.sway = SWAY[Math.floor(TT * 1.25 + 1e-6) & 3];
      P.eyes = 1; P.halo = Math.floor(TT * 1.25 + 1e-6) & 1 ? 2 : 1;
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { P.head = 1; P.look = 1; P.halo = 3; P.glint = (Math.floor((lp - 1.6) * 12 + 1e-6) & 1) ? 0 : 1; }   // 默祷到深处：低头，光环亮到最大
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 滑翔：羽翼半展平移，每拍轻扇一次
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); P.wing = WING_MOVE[f]; P.alt = ALT + 1 + ALT_MOVE[f]; P.sway = -1 - (f & 1); P.beard = -1 - (f === 3 ? 1 : 0); P.lean = 1;
      P.bhx += 1; P.ba = 0.2; P.halo = 1;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.alt = ALT + 3; P.wing = 1; P.beard = 1; P.gem = 1; }
      else if (tq < 0.2) { setK(K_DIVE, K_DIVE, 0); P.bx = 5; P.alt = 1; P.wing = 3; P.beard = -2; P.sway = -2; P.glint = 1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_DIVE, K_HOLD, q); P.bx = RD(5 - q); P.alt = 2; P.wing = 2; P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(4 * (1 - q)); P.alt = RD(2 + 2 * q); P.wing = 4; }
    } else if (st === CHARGE) {                                        // 羽翼缓缓张到最大，光环扩大，圣徽 1 → 2 档，旧伤痕浮现
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q); P.alt = ALT + RD(q); P.wing = q < 0.3 ? 4 : 5;
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.halo = q > 0.5 ? 3 : 2; P.scar = tq > 0.7 ? 1 : 0;
    } else if (st === CAST) {                                          // 光柱落下：羽翼猛扇一下（下压 1 帧 → 张开），伤痕一闪化金线
      setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.alt = ALT + 2; P.wing = tq < 1 / 12 ? 3 : 5; P.beard = -2; P.sway = -1; P.gem = 3; P.rim = 3; P.halo = 3;
      P.scar = tq < 2 / 12 ? 2 : tq < 3 / 12 ? 3 : 0; P.aura = tq >= 1 / 12 ? 1 : 0; P.glint = tq < 0.1 ? 1 : 0;
    } else if (st === RECOVER) {                                       // 羽翼收回半展，长枪回到胸前
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.alt = ALT + RD(2 * (1 - q)); P.wing = q < 0.4 ? 5 : 4;
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.aura = tq < 0.35 ? 1 : 0; P.halo = q < 0.5 ? 2 : 1; P.beard = -RD(1 - q);
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.wing = 0; P.alt = ALT - 1; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; P.wing = 4; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 羽翼失力垂落 → 坠地（前扑）→ 盾、长枪先后落地 → 羽毛化成金色光点上升
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.wing = 0; P.alt = ALT - 1; P.gem = (f12 & 1) ? 1 : 0; P.halo = 1; }
      else {
        P.eyes = 1; P.halo = 0; P.gem = 4;
        const sq = clamp01((d - 0.3) / 0.12), wq = clamp01((d - 0.4) / 0.15);   // 盾先落地（0.42）、长枪后落地（0.55）
        P.drop = sq >= 1 ? 2 : 1; P.shY = RD(14 * (1 - sq * sq)); P.spY = d < 0.4 ? 24 : RD(15 * (1 - wq * wq));   // 24 = 还握在手里
        if (d < 0.5) { setK(K_FALL, K_FALL, 0); P.bx = -3; P.wing = 6; P.alt = d < 0.4 ? 3 : 1; P.beard = 2; }
        else {
          setK(K_FALL, K_FALL, 0); P.lying = 1; P.bx = -3; P.alt = 0; P.wing = 6; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
          if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
        }
      }
    } else if (st === REVIVE) {
      idle(); P.alt = ALT;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.ba = RD(P.ba / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.alt = Math.max(0, RD(P.alt));
    if (P.st === DEATH && P.drop) { P.gx = 14 + P.bx; P.gy = -4 - P.shY; }
    else { P.gx = P.hx + 1 + P.bx; P.gy = P.hy - 2 - P.alt; }         // 发光体 = 盾心十字圣徽
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：featherWing 分层羽翼——前缘（肩 → 腕 → 掌）一条白色覆羽带，掌段挂 4 根初级飞羽（从翼尖往里依次下垂 fan），臂段挂 3 根次级飞羽，
  // 翼面只实心到飞羽一半、外半段分开成锯齿。两个部件：初级飞羽 → 次级 + 翼面 + 覆羽（从后往前）
  // 翼内只在初级飞羽和翼面之间有分界线。翼姿表 [臂角 a, 臂长, 掌角 b, 掌长, 初级飞羽长, 下垂扇角 fan, 次级飞羽长]：角度从正后方（-x）量起，+ 为向上。
  // o = { far 远翼（暗一级材质）, da 角度整体上抬, sc 尺寸倍数, fanK 扇角倍数 }。返回最外侧初级飞羽的尖（挂饰用）
  const WP = [
    [0.9, 7, -0.3, 4, 12, 0.5, 6],                                   // 0 收拢
    [1.35, 9, 1.15, 6, 14, 0.9, 8],                                  // 1 上扬
    [0.35, 9, 0.05, 6, 14, 0.8, 8],                                  // 2 后展
    [-0.6, 8, -0.9, 5, 13, 0.6, 7],                                  // 3 下扇
    [1.1, 8, 0.8, 5, 13, 1.1, 8],                                    // 4 半展（待机 / 滑翔）
    [0.75, 12, 0.35, 8, 18, 1.3, 10],                                // 5 张到最大（蓄力 / 施放）
    [-0.2, 8, -0.9, 5, 13, 0.5, 7],                                  // 6 垂落（死亡）
  ];
  function featherWing(x, y, pose, o) {
    const W = WP[pose] || WP[0], U = B.util, sc = o.sc || 1, da = o.da || 0, fan = W[5] * (o.fanK || 1);
    const a = W[0] + da, b = W[2] + da, mw = o.far ? M.fwF : M.fw, mp = o.far ? M.fpF : M.fp;
    const wx = x - Math.cos(a) * W[1] * sc, wy = y - Math.sin(a) * W[1] * sc, kx = wx - Math.cos(b) * W[3] * sc, ky = wy - Math.sin(b) * W[3] * sc;
    const pr = [], se = [];
    for (let k = 0; k < 4; k++) {                                      // 初级飞羽：k = 0 在翼尖、顺着掌的方向，往里依次下垂
      const q = 1 - 0.24 * k, ox = wx + (kx - wx) * q, oy = wy + (ky - wy) * q, d = b - fan * k / 3, l = W[4] * sc * (1 - 0.1 * k);
      pr.push([ox, oy, ox - Math.cos(d) * l, oy - Math.sin(d) * l]);
    }
    const dS = b - fan - 0.35;
    for (let j = 2; j >= 0; j--) {                                     // 次级飞羽：挂在臂段，朝翼面最下垂的方向再下垂一点
      const q = 0.3 + 0.3 * j, ox = x + (wx - x) * q, oy = y + (wy - y) * q, l = W[6] * sc * (0.8 + 0.1 * j);
      se.push([ox, oy, ox - Math.cos(dS) * l, oy - Math.sin(dS) * l]);
    }
    E.part();
    for (let k = 3; k >= 0; k--) { const p = pr[k]; U.taper(E, p[0], p[1], p[2], p[3], 1.6, 0.5, mp, 0); }   // 自动明暗：受光侧白、中间奶白、暗侧金
    E.part();
    const web = [x, y, wx, wy, kx, ky]; const h = (p, t) => [p[0] + (p[2] - p[0]) * t, p[1] + (p[3] - p[1]) * t];
    for (const p of pr) web.push(...h(p, 0.45)); for (const p of se) web.push(...h(p, 0.5)); web.push(x + 1, y + 2);
    U.poly(E, web, mw, 0);
    for (const p of se) U.taper(E, p[0], p[1], p[2], p[3], 1.4, 0.6, mw, 0);
    // 前缘覆羽（和翼面同一部件，不压分界线）：2 格宽的白带，下沿一排金点（翼缘）
    U.seg(E, x, y, wx, wy, 2, mw, 4); U.seg(E, wx, wy, kx, ky, 2, mw, 4);
    for (let j = 1; j <= 3; j++) { const q = j / 4; U.dot(E, x + (wx - x) * q - Math.cos(dS) * 1.5, y + (wy - y) * q - Math.sin(dS) * 1.5, mp, 2); }
    U.dot(E, (wx + kx) / 2 - Math.cos(b - fan) * 1.5, (wy + ky) / 2 - Math.sin(b - fan) * 1.5, mp, 2);
    return [Math.round(pr[0][2]), Math.round(pr[0][3])];
  }
  function wingPair(R, rx, ry, pose) {
    const up = pose === 5 || pose === 1;
    featherWing(rx + 3, ry - 9, pose, { far: 1, da: pose === 5 ? 0.4 : pose === 6 ? 0.2 : 0.15, sc: 0.9, fanK: pose === 5 ? 0.35 : 0.45 });   // 远翼：翼根更靠前、更高，更竖，翼尖从光环后面伸出盔沿
    const t = featherWing(rx, ry, pose, { da: up ? 0 : -0.05 });
    E.part();                                                          // 翼尖残留的红布条：从最外侧初级飞羽尖往下垂，1 格宽 3 格长，会随 beard 摆
    const d = B.util.dot, sw = P.beard > 0 ? 1 : 0;
    d(E, t[0], t[1] + 1, M.ribbon, 4); d(E, t[0], t[1] + 2, M.ribbon, 3); d(E, t[0] - sw, t[1] + 3, M.ribbon, 3);   // 贴地画笔：不画进地面以下
  }
  // 候选部件：halo 盔后悬浮光环——盔缨后上方一圈扁椭圆（侧看的光环，近侧半圈亮一级），lv 0–3（3 = 扩大一圈），flat 材质按档换色调
  function halo(R, lv) {
    E.part(); const cx = R.hx - 2, cy = R.htop - 9, rx = lv >= 3 ? 5.5 : 4.5, ry = lv >= 3 ? 2 : 1.5, n = 36, t = lv === 0 ? 1 : lv === 1 ? 2 : lv === 2 ? 3 : 4;
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; parts.px(E, R, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, M.halo, Math.sin(a) > 0.3 && t < 4 ? t + 1 : t); }
  }
  const CRACKS = [[0, 0], [1, -1], [2, -1], [3, -2]];
  function drawHero() {
    E.begin(hero, P.bx, -P.alt); const R = parts.rig(P, P.look ? BODY_LOOK : BODY), dead = P.st === DEATH && P.drop;
    if (!R.lie && !R.kneel && P.alt > 0) { R.footFx += 1; R.footBx -= 1; R.footBup = 1; }   // 悬停：两腿一前一后微垂
    // 羽翼（最后面）：倒地时翼根跟着背转过去，翼姿 6 垂落盖在身上
    if (R.lie) { const r = parts.toSprite(R, R.sBx + 1, R.yS + 3); wingPair(R, r[0], r[1], 6); }
    else wingPair(R, R.sBx + 1, R.yS + 3, P.wing);
    if (!R.lie && P.halo > 0) halo(R, P.halo);
    parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.plateD, pauldron: M.plateD, grip: 'none' });
    parts.legs(E, R, P, { style: 'greave', mat: M.plate, matD: M.plateD, boot: M.gold, bootD: M.goldD });
    parts.torso(E, R, P, { style: 'plate', mat: M.plate, tabard: M.tabard, belt: M.belt, buckle: M.gold });
    if (P.scar) {                                                      // 旧伤痕（和赤卫同样的 3 道位置），和躯干同一部件：浮现 → 金线 → 白 → 消失
      const ys = [R.yHip - 1, R.yHip - 4, R.yS + 2];
      for (let i = 0; i < 3; i++) { const x = parts.edges(R, ys[i])[0] + 1 + (i === 1 ? 1 : 0); for (const [dx, dy] of CRACKS) parts.px(E, R, x + dx, ys[i] + dy, M.lit, P.scar === 1 ? 1 : P.scar === 2 ? 3 : 4); }
    }
    parts.head(E, R, P, { mat: M.skin, face: 'long', eye: M.ink, ear: 'pointy', nose: 'small', mouth: 'line' });
    parts.helm(E, R, P, { style: 'nasal', mat: M.silver, trim: M.gold, crest: M.crest });
    { const T = { r0: 0, tx: R.hx, ty: R.htop - 1, rot: R.rot, ox: R.ox, oy: R.oy }, b = RD(P.beard || 0);   // 红缨加长：沿背后再垂 3 格（和盔缨同一部件）
      parts.px(E, T, -9, 1, M.crest, 0); parts.px(E, T, -9 + (b > 0 ? 1 : 0), 2, M.crest, 2); parts.px(E, T, -10 + (b > 1 ? 1 : 0), 3, M.crest, 0); parts.px(E, T, -10 - (b < 0 ? 1 : 0), 4, M.crest, 4); }
    if (dead && P.spY < 24) {                                          // 盾先脱手、长枪后脱手，坠地
      parts.spear(E, R, P, Object.assign({}, SPEAR, { free: 1, at: [4, -1 - P.spY + P.alt], a: P.spY > 0 ? 2.4 : HALF }));
    } else { parts.spear(E, R, P, P.st === ATTACK ? SPEAR_ATK : SPEAR); parts.hand(E, R, P, { side: 'B', hand: M.plate }); }
    parts.arm(E, R, P, { sleeve: 'plate', mat: M.plate, pauldron: M.plate, pStyle: 'spike', trim: M.gold, hand: M.plate });
    const em = P.gem >= 2 && P.gem <= 3 ? M.lit : M.gold;
    if (dead) parts.shield(E, R, P, { style: 'kite', face: M.silver, rim: M.gold, emblem: em, emblemStyle: 'cross', free: 1, at: [14, (P.shY > 0 ? -7 - P.shY : -4) + P.alt], rot: P.shY > 0 ? 0 : 1 });
    else {
      const sh = parts.shield(E, R, P, { style: 'kite', face: M.silver, rim: M.gold, emblem: em, emblemStyle: 'cross' });
      const c = sh.center, cy = c[1] - 3;                              // 圣徽交叉点（和盾同一部件）按档亮
      if (P.gem === 3) { E.sp(c[0], cy, M.lit, 4); E.sp(c[0], cy - 1, M.lit, 4); E.sp(c[0] - 1, cy, M.lit, 4); E.sp(c[0] + 1, cy, M.lit, 4); }
      else if (P.gem >= 1 && P.gem <= 2) E.sp(c[0], cy, M.lit, P.gem === 2 ? 4 : 3);
      if (P.glint) E.sp(c[0] - 1, cy - 1, M.lit, 4);
    }
  }
  function bakeHero() {
    RIM.rim = P.aura ? 2 : P.rim; RIM.rimAll = P.aura ? 1 : 0;
    if (P.aura) { RIM.rx = P.bx + hero.ox; RIM.ry = -16 - P.alt + hero.oy; } else { RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; }
    RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
  }

  // ───── 特效 ─────
  let dvA = [0, 0, 0, 0], dvT = 9, crossAcc = 0, soulAcc = 0, lastF = -1, spiralAcc = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const PLUS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
  function plus(x, y, vy, life) { x = RD(x); y = RD(y); for (const [dx, dy] of PLUS) spawnX(K_PHYS, x + dx, y + dy, 0, vy, life, R_EL, {}); }   // 上升的金色「＋」
  function feathers(x, y, n, spd) { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 6, (Math.random() - 0.5) * spd, -Math.random() * spd * 0.6, 0.6 + Math.random() * 0.5, R_EL, { g: 30, dragX: 0.2, dragY: 0.3, floor: HY }); }
  function onEnter(s) {
    if (s === CHARGE) fx.circle(wx(1), HY, 13, 3, R_EL, 1.9, 1, 0);   // 脚下金色十字法阵（持续到施放）
    if (s !== CAST) return;
    fx.pillar(wx(1), 0, HY, 6, R_EL, 0.6, 0);                           // 头顶金白光柱落在自己身上（身后一层）
    fx.pillar(wx(1), 0, wy(-40), 2, R_EL, 0.35, 2);                     // 光柱头顶那一段（身前）
    fx.cross(wx(1), HY - 1, 6, R_EL, 0.3, 0);
    ring(wx(1), HY - 2, 1, R_EL); feathers(wx(-10), wy(-26), 16, 90);   // 羽翼猛扇：一圈金羽外爆
    burst(wx(0), wy(-20), 20, 40, 110, 0.3, 0.7, R_EL, 10);
    shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'holy', w: 0.6 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_DIVE) {                                 // 俯冲突刺：羽毛拖影残影 + 枪身光束 + 命中火花
      const g = parts.along(P, SPEAR_ATK, -3), tip = parts.spear.focus(P, SPEAR_ATK), tx = wx(tip[0] + P.bx), ty = wy(tip[1] - P.alt);
      dvT = 0; dvA = [wx(-16), wy(-30 - ALT), tx - 5, ty - 1]; fx.beam(wx(g[0] + P.bx), wy(g[1] - P.alt), tx, ty, 1, R_EL, 0.17, 2);
      const hx = Math.min(tx, DUMMY_X - 2); hitDummy(0); burst(hx, ty, 14, 40, 110, 0.15, 0.35, R_IMP, 10); fx.cross(hx, ty, 4, R_IMP, 0.2);
      feathers(wx(-8), wy(-24), 6, 40);
      sfx('swing', { kind: 'thrust', w: 0.5 }); sfx('hit', { mat: 'metal', w: 0.5 });
    }
    if (s === CHARGE) fx.cross(wx(P.gx), wy(P.gy), t < 0.7 ? 3 : 5, R_EL, 0.2);
    if (s === CAST && Math.abs(t - 2 / 12) < 1e-9) { fx.cross(wx(-2), wy(-18 - ALT), 7, R_EL, 0.3); sfx('impact', { pal: 'holy', w: 0.35 }); }   // 伤痕化金线那一闪
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) {                   // 坠地：尘土 + 羽毛散开
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 16 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      feathers(HX - 6, HY - 6, 14, 60); shake(0.12, 1); sfx('fall', { w: 0.6 });
    }
  }
  const EVENTS = [[], [], [T_DIVE], [0.5, 0.95], [2 / 12], [], [], [T_LAND], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                             // 金色羽光向盾心收拢
      spiralAcc += dt * (18 + 26 * clamp01(stT / DUR[CHARGE]));
      while (spiralAcc >= 1) { spiralAcc -= 1; const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 9; spawn(K_SPIRAL_PT, wx(P.gx), wy(P.gy), r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, (Math.random() - 0.5) * 3); }
    }
    if ((state === CAST && stT >= 1 / 12) || (state === RECOVER && stT < 0.45)) {   // 光柱中连续升起金色「＋」：比赤卫多一倍、快一倍
      crossAcc += dt * 16;
      while (crossAcc >= 1) { crossAcc -= 1; plus(wx(-5 + Math.random() * 12), wy(-2 - Math.random() * 10 - P.alt), -32 - Math.random() * 16, 0.55 + Math.random() * 0.2); }
    }
    if (state === MOVE) {                                               // 滑翔：每拍一次轻扇，身下落下 1–2 片金色羽光
      const f = E.gait(q12(stT)); if (f !== lastF) { if (f === 3) { const n = 1 + (Math.random() < 0.5 ? 1 : 0); for (let i = 0; i < n; i++) spawnX(K_PHYS, wx(-3 + Math.random() * 6), wy(-P.alt - 1), (Math.random() - 0.5) * 6, 6, 0.8, R_EL, { g: 8, floor: HY }); } lastF = f; }
    }
    if (state === IDLE && Math.random() < dt * 1.5) spawn(K_RISE, wx(-6 + Math.random() * 8), wy(-38 - Math.random() * 2), (Math.random() - 0.5) * 3, -6 - Math.random() * 4, 0.7, R_EL);   // 光环边飘出的光点
    if (state === DEATH && stT > INCOMING + 0.75 && stT < INCOMING + 1.5 && Math.random() < dt * 9)   // 倒地后白羽一片片从身上往上飘，再转成金色光点
      spawnX(K_PHYS, HX - 16 + Math.random() * 18, HY - 3 - Math.random() * 5, (Math.random() - 0.5) * 8, -10 - Math.random() * 8, 0.9 + Math.random() * 0.4, R_EL, { g: -4, dragX: 0.4 });
    if (state === DEATH && stT > INCOMING + 1.5 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 30, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_EL); } }   // 羽毛化成金色光点上升
    dvT += dt;
  }
  function fxReset() { dvT = 9; crossAcc = 0; soulAcc = 0; lastF = -1; spiralAcc = 0; }
  function fxBack(f12) {
    if (!P.lying && P.dq < 1 && !(P.st === DEATH && P.drop)) groundShadow(wx(0), 7, P.alt);
    if (!P.lying && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12);
  }
  function fxMid() {                                                   // 俯冲拖影：3 条沿俯冲方向的羽毛弧线（第 1 帧实线，之后断续变暗）
    if (dvT >= 0.25) return;
    const [x0, y0, x1, y1] = dvA, L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L, n = Math.ceil(L), f = Math.floor(dvT * 12 + 1e-6);
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * 3, bow = 2 - i;
      for (let k = Math.floor(n * (0.15 + 0.2 * f)); k <= n; k++) {
        if (f >= 1 && (k & 1)) continue; const t = k / n, b = Math.sin(t * Math.PI) * bow;
        put(RD(x0 + (x1 - x0) * t + nx * (off + b)), RD(y0 + (y1 - y0) * t + ny * (off + b)), f === 0 ? (t > 0.6 ? EL[0] : EL[1]) : f === 1 ? EL[2] : EL[3]);
      }
    }
  }
  function fxFront(f12) {
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && !P.lying && !P.drop) {  // 圣徽星芒
      const gx = wx(P.gx), gy = wy(P.gy), L = P.gem === 3 ? 6 : 3 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 4 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
  }

  return {
    name: '圣光骑士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.halo, M.lit], HIT_POINT: [2, -18], EVENTS,
    SFX: { body: 'armor', how: 'collapse', pal: 'holy', style: 'heal', w: 0.6, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
