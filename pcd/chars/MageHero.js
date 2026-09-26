// 法师英雄（部队 · 自然 · 射手 · 稀有 · 远程 680）：野法师 → 炮灰法师的最终形态，同一株球茎长成了成株——
// 球茎收回成 7 格高的奶白洋葱头，身体抽高成修长的深藤绿茎秆（高个档，腿长占一半）；头顶一朵 6 瓣洋红大花冠（宽 12、高出头 5，花心是发光体）、
// 背后长叶披风下摆 3 片长叶尖拖到小腿（承接叶披肩）、双手持比人还高的藤蔓长弓（弓梢卷须伸出头顶和脚下）、腰间一小袋秘晶（承接钱袋）。
// 攻击 = 拉满弓 2 帧，射出一支带叶尾的荆棘箭，平直、快；
// 技能 = 特性「超级绽放」：脚下冒出一圈小芽、花粉汇聚花心、花冠一瓣瓣张开 → 花冠猛地全开（多 2 瓣）、身体抽高 2 格 → 头顶金绿上箭头、身周叶环、脚下藤圈收拢。
// 死亡 = 跪下后自上而下化成洋红花瓣与叶片飘散（死亡套件 ash，花瓣色阶），最后一片花瓣落地。
PCD.define('MageHero', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_BURST,
    spawn, burst, releaseOrbit, shoot, ring, shake, flash, fx, death, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, PX = parts.px;

  // ───── 元素：盛放 · 花粉金绿（21 白 → 淡金花粉 → 金 → 叶绿 → 深绿），花瓣点缀洋红 ─────
  const R_EL = E.fxRamp('bloom', [21, 51, 14, 36, 35]), EL = FXR[R_EL];
  const R_PETAL = E.fxRamp('petal', [21, '#ff9ac8', '#d8408a', '#8a1a52', '#3a0a24']), PET = FXR[R_PETAL];
  const R_NAT = FXI.nature;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    vine: { r: ['#0c1f14', '#1d4428', '#2f6b3a', '#4f9a52'], band: 2 },   // 深藤绿茎叶甲（身体、叶披风，面积最大）
    armor: ['#0c1f14', '#1d4428', '#2f6b3a', '#4f9a52'],
    leaf: ['#13240c', '#2f5a1a', '#5f9a2c', '#a6d45a'],                  // 叶披肩、弓上小叶、箭羽（沿用野法师）
    petal: ['#3a0a24', '#8a1a52', '#d8408a', '#ff9ac8'],                 // 洋红花冠
    bulb: ['#3a3020', '#8a7a8c', '#d8ccae', '#f4efe0'],                  // 奶白洋葱头（沿用野法师）
    bow: 'wood', string: 'white', shaft: 'wood', thorn: 'bone', root: 'wood', pouch: 'leather', ink: { r: 'ink', flat: 1 },
    heart: { r: [61, 14, 51, 21], flat: 1 },                              // 花心（发光体）
    crystal: { r: [11, 12, 63, 58], flat: 1 },
  });
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(84, 56, 40, 50);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['bow', 'string', 'shaft', 'thorn', 'ink', 'bulb', 'heart', 'crystal', 'pouch', 'leaf']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  const bodyOpt = () => ({ body: 'tall', head: 7, headW: 7, leg: 11 + (P.grow >= 1 ? 1 : 0), torso: 10 + (P.grow >= 2 ? 1 : 0), waist: 1, fall: 'back' });

  // ───── 姿势：前手握弓身，后手搭箭 / 拉弦（pull 0–3），fl 花冠开度（0 花苞 · 1 六瓣 · 2 全开八瓣 · 3 盛放），grow 抽高格数 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0, gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0,
    lying: 0, lift: 0, hatX: 0, hatY: 0, drop: 0, dq: 0, pull: 0, fl: 1, grow: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch, pull) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0, pull: pull || 0 });
  // 长弓握把在胸前 y≈−16、手臂前伸到 x≈+10（弦在 x≈+4，弓和弦之间的镂空整段落在身体前面，剪影里看得见）（弓长 33 格，下弓梢刚好到地面），所以各姿势的 hy 不低于 −15
  const K_IDLE = K(10, -16, -2, -11);                  // 长弓竖在身前，后手自然垂
  const K_TEST = K(11, -16, -1, -16, 0, 0, 0, 2);      // 待机：半拉开弓
  const K_NOCK = K(10, -17, 3, -16, 0, 0, 0, 1);       // 攻击后引：举弓搭箭
  const K_DRAW = K(12, -17, 0, -17, -1, 0, 0, 3);     // 拉满（弦成 V 形拉到脸侧）
  const K_LOOSE = K(12, -17, -3, -18, -1, 0, 0, 0);   // 松弦：后手向后弹开
  const K_HOLD = K(11, -16, -2, -16);
  const K_CHARGE = K(10, -15, -6, -15, -1, -1);        // 蓄力：弓垂在身侧、后手张开、仰头
  const K_CAST = K(11, -16, -7, -19, -1, -1);
  const K_HURT = K(8, -15, -4, -10, -1, -1);
  const K_KNEEL = K(8, -8, 1, -8, 1, 1, 4);
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch', 'pull'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1], ['pull', 0, 3], ['fl', 0, 3], ['grow', 0, 2]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['drop', 0, 2], ['hatX', -8, 23], ['hatY', -2, 15]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], T_LOOSE = 3 / 12, T_BLOOM = 2 / 12, T_KNEEL = INCOMING + 0.36, T_ASH = INCOMING + 1.2;
  const T_LAND = INCOMING + 7 / 12, BOW_LAND_X = 18;   // 弓落地：握把落在身前 x = 18（离手 9–10 格）
  // 待机个性（1.6–2.0 s，5 帧）：试拉弓弦——半拉开再松回去，花冠跟着一开一合
  const PERS_Q = [0.5, 1, 1, 0.5, 0], PERS_FL = [1, 2, 2, 1, 0];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 1; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.drop = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.fl = 1; P.grow = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { const i = Math.floor((lp - 1.6) * 12 + 1e-6); setK(K_IDLE, K_TEST, PERS_Q[i]); P.fl = PERS_FL[i]; P.glint = i === 2 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                             // 轻盈迈步：长腿大步、脚尖着地，叶披风向后飘
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.bend = 2 + (P.step === 0 ? 1 : 0); P.hx += P.step * 0.6; P.bhx -= P.step;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 1 / 12) { setK(K_IDLE, K_NOCK, 1); P.beard = 0; }        // 第 0 帧：后引（举弓搭箭）
      else if (tq < T_LOOSE) { setK(K_DRAW, K_DRAW, 0); P.beard = 1; P.gem = 1; }   // 第 1–2 帧：拉满
      else if (tq < T_LOOSE + 1 / 12) { setK(K_LOOSE, K_LOOSE, 0); P.beard = -2; P.sway = -1; P.bend = 3; P.fl = 2; }
      else if (tq < 0.5) { setK(K_LOOSE, K_HOLD, ease.out((tq - T_LOOSE - 1 / 12) / 0.17)); P.beard = -1; P.bend = 2; }
      else setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.5) / 0.25)));
    } else if (st === CHARGE) {                                         // 花粉汇聚花心，花冠一瓣瓣张开，轮廓光 1 → 3
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      P.fl = tq < 0.35 ? 0 : tq < 0.8 ? 1 : 2; P.rim = tq < 0.5 ? 1 : tq < 1.0 ? 2 : 3; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1);
      P.beard = -RD(q * 2); P.bend = 1 + RD(q * 2); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
    } else if (st === CAST) {                                           // 花冠猛地全开、身体抽高 2 格定格
      setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.fl = 3; P.grow = tq < 1 / 12 ? 1 : 2; P.gem = 3; P.rim = 3; P.beard = -2; P.sway = -1; P.bend = 3; P.glint = tq < 0.2 ? 1 : 0;
    } else if (st === RECOVER) {                                        // 身体回落 1 格，花冠多保持大一档 0.4 s
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.grow = tq < 0.2 ? 1 : 0; P.fl = tq < 0.4 ? 3 : tq < 0.55 ? 2 : 1;
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.beard = -RD(1 - q);
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.fl = 0; P.rim = 0; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.fl = 0; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                          // 受击 → 踉跄 → 跪下（花冠合拢）→ 自上而下化成花瓣
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.fl = 0; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else { setK(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.eyes = 1; P.beard = 1; P.bend = 0; P.fl = 0; P.gem = d < 0.7 ? ((f12 & 1) ? 1 : 4) : 4; P.crouch = d < 0.36 ? 2 : 4;
        // 弓从手中滑脱：竖着脱手 → 抛物线向前弹两跳（x 12 → 15 → 17，离地 0 → 3 → 2）→ 整 90° 向前倒成横躺，落在身前 x = 18，小弹一下
        const dl = T_LAND - INCOMING;
        if (d < 0.4) { P.drop = 1; P.hatX = 12; P.hatY = 0; }
        else if (d < 0.48) { P.drop = 1; P.hatX = 15; P.hatY = 3; }
        else if (d < dl) { P.drop = 1; P.hatX = 17; P.hatY = 2; }
        else { P.drop = 2; P.hatX = BOW_LAND_X; P.hatY = d < dl + 1 / 12 ? 1 : 0; }
        // 1.3–1.5 s 先从头顶开始消散几帧，1.5 s 再交给花瓣化灰
        if (d >= 1.2) P.dq = 1; else if (d >= 1.0) P.dq = 0.12 + 0.3 * (d - 1.0) / 0.2; }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch)) - P.grow;
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.pull = RD(P.pull);
    const R = parts.rig(P, bodyOpt()); P.gx = R.hx + P.bx; P.gy = R.htop - 2 - (P.fl >= 2 ? 1 : 0);   // 发光体 = 花心
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：leafCape —— 长叶披风：parts.cape + 下摆 3 片长叶尖（叶脉一道暗线），拖到小腿
  function leafCape(R) {
    const c = parts.cape(E, R, P, { mat: M.vine, len: -5, flare: 3 }), b = c.bot, L = c.back, s = RD(P.sway || 0), bd = P.bend || 0;
    for (let k = 0; k < 3; k++) { const x = L + 1 + k * 3 - (k === 0 ? RD(bd * 0.5) : 0) + (k === 0 ? s : 0); PX(E, R, x, b + 1, M.vine, 0); PX(E, R, x + 1, b + 1, M.vine, 0); PX(E, R, x + (k === 0 ? -1 : 0), b + 2, M.vine, 4); if (k === 0) PX(E, R, x - 1 - RD(bd * 0.5), b + 3, M.vine, 4); }
    for (let y = R.yS + 3; y < b; y += 2) PX(E, R, L + 3 + RD((y - R.yS) * 0.12), y, M.vine, 2);
  }
  // 候选部件：bulbHeadAdult —— 7 格高洋葱头（成株，比野法师的收小），细眼 + 眉，淡紫纵纹
  const BULB7 = [1, 3, 5, 7, 7, 7, 5];
  function bulbHead(R) {
    E.part(); const top = R.htop, c = R.hx;
    for (let i = 0; i < 7; i++) { const w = BULB7[i]; parts.run(E, R, top + i, c - (w - 1) / 2, c + (w - 1) / 2, M.bulb, 0); }
    for (let y = top + 1; y < R.hy; y++) PX(E, R, c - 1, y, M.bulb, 2);
    const ex = c + 2, ey = R.ey;
    if (P.eyes) PX(E, R, ex, ey + 1, M.bulb, 1); else { PX(E, R, ex, ey, M.ink, 1); PX(E, R, ex, ey + 1, M.ink, 1); }
    PX(E, R, ex - 1, ey - 1, M.bulb, 1); PX(E, R, ex, ey - 1, M.bulb, 1); PX(E, R, c + 3, ey + 2, M.bulb, 1);
  }
  // 候选部件：flowerCrown —— 放射状花冠（fl 0 花苞 · 1 六瓣 · 2 全开八瓣 · 3 盛放加长），每瓣 2 格宽、瓣尖亮；花心 2×2 发光体和花瓣同一部件
  // 六瓣常态宽约 13 格、高出头 6 格（比炮灰法师的叶冠大一档）
  const FL = [[[-22, 5], [-8, 5], [8, 5], [22, 5]], [[-82, 7], [-50, 7], [-18, 7], [18, 7], [50, 7], [82, 7]], [[-96, 7], [-68, 8], [-40, 8], [-13, 8], [13, 8], [40, 8], [68, 8], [96, 7]],
    [[-102, 8], [-72, 9], [-44, 9], [-15, 9], [15, 9], [44, 9], [72, 9], [102, 8]]];
  function flowerCrown(R) {
    E.part(); const cx = R.hx + 0.5, cy = R.htop - 1 - (P.fl >= 2 ? 1 : 0), droop = P.st === DEATH ? 2 : 0;
    for (const [deg, L] of FL[P.fl]) {
      const a = deg * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), nx = -dy, ny = dx;
      for (let s = 1; s <= L; s++) {
        const x = cx + dx * s, y = cy + dy * s + (droop ? s * s * 0.08 : 0), tip = s === L;
        PX(E, R, x, y, M.petal, tip ? 4 : 0); if ((s === (L >> 1) + 1 || (L >= 7 && s === (L >> 1))) && P.fl > 0) PX(E, R, x + nx * 0.9 * Math.sign(deg || 1), y + ny * 0.9 * Math.sign(deg || 1), M.petal, 0);
      }
    }
    const lv = P.gem, hx = RD(cx - 0.5), hy = RD(cy);
    const tn = lv === 4 ? 1 : lv === 3 ? 4 : lv === 2 ? 4 : lv === 1 ? 3 : 3;
    PX(E, R, hx, hy, M.heart, tn); PX(E, R, hx + 1, hy, M.heart, lv >= 2 && lv < 4 ? 4 : 2); PX(E, R, hx, hy + 1, M.heart, 2); PX(E, R, hx + 1, hy + 1, M.heart, lv === 4 ? 1 : 2);
    if (P.glint) PX(E, R, hx, hy - 1, M.heart, 4);
  }
  // 候选部件：vineLongbow —— D 形藤蔓长弓（弓身 + 弦一个部件，箭、卷须各一个部件）。
  //   弓身：握把 4 格直，之后上下弓臂每 4 格向后收 1 格，弓梢再向后弯 3 格（反曲），末端接卷须；弓臂上各长一片小叶。
  //   弦：pull 0 时从上弓梢直线连到下弓梢，握把处和弓身隔开 5 格（纯黑剪影里能看到镂空）；pull ≥ 1 且搭箭点在弦后时拉成 V 形到搭箭点。
  //   参数：gx, gy 握点；lie 0 竖握 | 1 横躺（整 90° 旋转，弓腹朝下、弓梢朝上，弦在上方）；pull 0–3；nock 搭箭点 [x, y]（竖握时用）
  const BOW_L = 16, BOW_OFF = [0, 0, 0, 0, -1, -1, -1, -1, -2, -2, -2, -2, -3, -3, -3, -4, -6];
  function vineBow(R, gx, gy, lie, pull, nock) {
    const pt = (o, r, m, t) => { if (lie) PX(E, R, gx + r, gy + o, m, t); else PX(E, R, gx + o, gy + r, m, t); };
    const seg = (o0, r0, o1, r1, m, t) => { const n = Math.max(Math.abs(o1 - o0), Math.abs(r1 - r0)) || 1; for (let i = 0; i <= n; i++) pt(RD(o0 + (o1 - o0) * i / n), RD(r0 + (r1 - r0) * i / n), m, t); };
    const tipO = BOW_OFF[BOW_L];
    E.part();
    for (let r = -BOW_L; r <= BOW_L; r++) {
      const a = Math.abs(r), x = BOW_OFF[a], xp = a ? BOW_OFF[a - 1] : 0;
      for (let xx = x; xx <= Math.max(x, xp - 1); xx++) pt(xx, r, M.bow, a <= 1 ? 3 : a >= BOW_L - 1 ? 4 : 0);
      if (a <= 2) pt(x + 1, r, M.bow, 2);                                      // 握把加厚
    }
    pt(1, -3, M.leaf, 3); pt(1, 3, M.leaf, 2);                                 // 握把上下的藤绑
    const nk = nock && !lie ? [nock[0] - gx, nock[1] - gy] : null;
    if (pull && nk && nk[0] < tipO) { seg(tipO, -BOW_L + 1, nk[0], nk[1], M.string, 3); seg(nk[0], nk[1], tipO, BOW_L - 1, M.string, 3); }
    else seg(tipO, -BOW_L + 1, tipO, BOW_L - 1, M.string, 3);
    if (!lie && pull && nk) {                                                  // 荆棘箭：木杆 + 骨白刺尖 + 叶尾
      E.part(); const a0 = Math.min(nk[0], tipO), ay = nk[0] < tipO ? nk[1] : 0;
      for (let o = a0; o <= 4; o++) pt(o, ay, M.shaft, 3);
      pt(5, ay, M.thorn, 4); pt(4, ay - 1, M.thorn, 3); pt(4, ay + 1, M.thorn, 2);
      pt(a0 + 1, ay - 1, M.leaf, 4); pt(a0, ay - 1, M.leaf, 3); pt(a0 + 1, ay + 1, M.leaf, 2);
    }
    E.part();                                                                  // 弓梢卷须（上梢向上卷、下梢贴地向后卷）+ 弓臂小叶
    pt(tipO - 1, -BOW_L - 1, M.leaf, 0); pt(tipO - 1, -BOW_L - 2, M.leaf, 0); pt(tipO, -BOW_L - 3, M.leaf, 3); pt(tipO + 1, -BOW_L - 3, M.leaf, 4);
    pt(tipO - 1, BOW_L, M.leaf, 0); pt(tipO - 2, BOW_L - 1, M.leaf, 0); pt(tipO - 2, BOW_L - 2, M.leaf, 4);
    pt(0, -8, M.leaf, 3); pt(1, -9, M.leaf, 4); pt(-1, 9, M.leaf, 3); pt(0, 10, M.leaf, 4);
  }
  const bowFocus = () => [P.hx + 6, P.hy];
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, bodyOpt());
    leafCape(R);
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.armorD, cuff: M.leafD, grip: 'none' });
    parts.legs(E, R, P, { style: 'boot', mat: M.armor, matD: M.armorD, boot: M.root, bootD: M.rootD, bootH: 4 });
    parts.torso(E, R, P, { style: 'leather', mat: M.armor, trim: M.leaf, belt: M.root, buckle: M.heart, strap: M.root });
    parts.pendant(E, R, P, { style: 'pouch', mat: M.pouch, trim: M.crystal });
    bulbHead(R);
    parts.mantle(E, R, P, { style: 'plain', mat: M.leaf, len: 3 });
    flowerCrown(R);
    parts.arm(E, R, P, { sleeve: 'tight', mat: M.armor, cuff: M.leaf, hand: M.armor });
    if (!P.drop) { vineBow(R, P.hx, P.hy, 0, P.pull, [P.bhx, P.bhy]); parts.hand(E, R, P, { side: 'B', hand: M.armor }); }
    else if (P.drop === 1) { parts.hand(E, R, P, { side: 'B', hand: M.armor }); vineBow(R, P.hatX, -17 - P.hatY, 0, 0, null); }             // 脱手、竖着向前弹
    else { parts.hand(E, R, P, { side: 'B', hand: M.armor }); vineBow(R, P.hatX, -1 - P.hatY, 1, 0, null); }                               // 横躺飞出 / 落地
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let mzT = 9, mzX = 0, mzY = 0, upT = 9, vineT = 9, chargeAcc = 0, emberAcc = 0, lastStep = 0, lastPers = -1, petAcc = 0, petT = -1;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function onEnter(s) {
    if (s === CHARGE) { fx.wave(HX + 2, HY, 1, 12, 3, R_NAT, 1.3, 0); fx.wave(HX - 2, HY, -1, 12, 3, R_NAT, 1.3, 0); }   // 脚下一圈小芽，细藤向两侧长
    if (s === CAST) {                                                  // 花冠全开：花瓣冲击环 + 十字星芒 + 30 颗花粉外爆
      const gx = wx(P.gx), gy = wy(P.gy); releaseOrbit(45, 110, 0.3, 0.7);
      ring(gx, gy, 1, R_PETAL); fx.cross(gx, gy, 9, R_EL, 0.35); burst(gx, gy, 30, 50, 130, 0.3, 0.75, R_EL, 10); burst(gx, gy, 10, 30, 80, 0.4, 0.8, R_PETAL, 6);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_LOOSE) {                                // 松弦：荆棘箭平直飞出
      const f = bowFocus(), x = wx(f[0] + P.bx), y = wy(f[1]); mzT = 0; mzX = x; mzY = y;
      shoot(1, x + 1, y, 260, DUMMY_X - 3, R_EL, 0, { trail: { every: 2, life: [0.06, 0.14], back: [8, 20] }, glow: -1 });
      sfx('swing', { kind: 'bow', w: 0.3 }); sfx('shoot', { proj: 'arrow' });
    }
    if (s === CAST && t === T_BLOOM) {                                  // 作用在自己身上：上箭头、叶环、藤圈收拢
      upT = 0; vineT = 0; fx.circle(HX + 1, HY - 15, 12, 5, R_NAT, 0.7, 3, 2); shake(0.12, 1); sfx('impact', { pal: 'nature', w: 0.5 });
    }
    if (s === DEATH && t === T_KNEEL) { for (let i = 0; i < 8; i++) spawn(K_DUST, HX - 6 + Math.random() * 16, HY - 1, (Math.random() - 0.5) * 20, -5 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust); sfx('fall', { w: 0.3 }); }
    if (s === DEATH && t === T_LAND) {                                  // 弓横躺落地：4 颗尘土
      for (let i = 0; i < 4; i++) spawn(K_DUST, wx(BOW_LAND_X - 12 + i * 8 + P.bx), HY - 1, (i < 2 ? -1 : 1) * (6 + Math.random() * 8), -4 - Math.random() * 6, 0.3 + Math.random() * 0.25, FXI.dust);
      sfx('fall', { w: 0.15 });
    }
    if (s === DEATH && t === T_ASH) { poseAt(DEATH, t, t); P.dq = 0.42; drawHero(); bakeHero(); hero.k1 = -1; death.start('ash', { ramp: R_PETAL }); }
  }
  const EVENTS = [[], [], [T_LOOSE], [], [T_BLOOM], [], [], [T_KNEEL, T_LAND, T_ASH], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 10, 30, 80, 0.12, 0.3, R_NAT, 8); burst(x, y, 4, 20, 50, 0.15, 0.3, FXI.impact, 6); hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.3 }); }
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE && stT > 0.15) {                               // 金色花粉从地面芽尖飘起，汇聚到花心
      chargeAcc += dt * (14 + 24 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = 0.9 + Math.random() * 1.4, r = 22 + Math.random() * 8; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.45 + Math.random() * 0.35), 0, 9, R_EL, a, r, 3 + Math.random() * 2); }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) sfx('step', { w: 0.15 }); lastStep = P.step; }
    if (state === IDLE || state === RECOVER) {
      emberAcc += dt * (state === IDLE ? 1.8 : 9);
      while (emberAcc >= 1) { emberAcc -= 1; if (state === IDLE) spawn(K_EMBER, gx + RD(Math.random() * 4 - 2), gy - 1, Math.random() * 8 - 4, -6 - Math.random() * 6, 0.6 + Math.random() * 0.5, R_EL); else spawn(K_EMBER, gx - 6 + Math.random() * 12, gy - 2 + Math.random() * 4, Math.random() * 10 - 5, 5 + Math.random() * 6, 1.0 + Math.random() * 0.6, R_PETAL); }
      const lp = q12(stT) % DUR[IDLE], f = state === IDLE && lp >= 1.6 && lp < 2.0 ? Math.floor((lp - 1.6) * 12 + 1e-6) : -1;
      if (f !== lastPers) { if (f === 2) burst(gx, gy, 5, 10, 25, 0.3, 0.5, R_EL, 4); lastPers = f; }
    }
    if (upT < 1) upT += dt;
    if (vineT < 1) vineT += dt;
    if (state === DEATH && stT >= INCOMING + 1.0 && stT < T_ASH + 1.0) {  // 头顶先消散时飘起洋红花瓣，化灰期间夹几片绿叶
      const pre = stT < T_ASH; petAcc += dt * (pre ? 30 : 8);
      while (petAcc >= 1) { petAcc -= 1; spawn(K_RISE, wx(P.bx + Math.random() * 14 - 6), HY - (pre ? 26 + Math.random() * 10 : 4 + Math.random() * 20), (Math.random() - 0.5) * 10, -8 - Math.random() * 12, 0.7 + Math.random() * 0.5, pre ? R_PETAL : R_NAT); }
    }
    petT = state === DEATH && stT >= T_ASH ? stT - T_ASH : -1;          // 花冠最后一片花瓣：从头顶左右摇摆着飘落到地面
    mzT += dt;
  }
  function fxReset() { mzT = 9; upT = 9; vineT = 9; chargeAcc = 0; emberAcc = 0; lastStep = 0; lastPers = -1; petAcc = 0; petT = -1; }
  function fxBack(f12) {
    if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12);
    if (vineT < 0.5) {                                                  // 脚下藤圈收拢：点阵椭圆从半径 14 缩到 5
      const q = ease.out(vineT / 0.5), r = 14 - 9 * q, n = 20;
      for (let k = 0; k < n; k++) { if (vineT > 0.3 && ((k + f12) & 1)) continue; const a = k / n * 6.2832 + q * 2; put(RD(HX + 1 + Math.cos(a) * r), RD(HY - 1 + Math.sin(a) * r * 0.25), k & 1 ? EL[3] : EL[2]); }
    }
  }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) { const L = P.gem === 3 ? 5 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); } }
    if (upT < 0.7) {                                                    // 头顶飘起 3 个金绿上箭头
      for (let i = 0; i < 3; i++) {
        const tt = upT - i * 0.08; if (tt < 0) continue; const x = HX + 1 + (i - 1) * 7, y = RD(HY - 34 - tt * 16 - (i === 1 ? 3 : 0)), c = tt < 0.15 ? EL[0] : tt < 0.35 ? EL[1] : tt < 0.55 ? EL[2] : EL[3];
        if (tt > 0.5 && ((f12 + i) & 1)) continue;
        put(x, y, c); put(x - 1, y + 1, c); put(x + 1, y + 1, c); put(x - 2, y + 2, EL[3]); put(x + 2, y + 2, EL[3]); put(x, y + 1, c); put(x, y + 2, c); put(x, y + 3, EL[3]);
      }
    }
    if (petT >= 0) {                                                    // 最后一片花瓣（2 格），0.9 s 落地后躺在地上
      const q = Math.min(1, petT / 0.9), x = wx(P.bx + 1 + RD(Math.sin(petT * 8) * 2.5 * (1 - q))), y = RD(HY - 27 + 26 * q), tilt = q < 1 && (f12 & 1);
      put(x, y, PET[1]); put(x + 1, y - (tilt ? 1 : 0), PET[2]); if (q >= 1) put(x - 1, y, PET[3]);
    }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; put(mzX, mzY, EL[0]); for (let r = 1; r <= 2; r++) { put(mzX + r, mzY, c); put(mzX, mzY - r, EL[2]); put(mzX, mzY + r, EL[2]); } }
  }
  function drawShot(k, x, y, d) {
    if (k !== 1) return false;                                          // 荆棘箭：骨白刺尖 + 木杆 + 两片叶尾
    put(x + d, y, 17); put(x, y, 18); for (let i = 1; i <= 4; i++) put(x - i * d, y, 19);
    put(x - 2 * d, y - 1, 20); put(x - 4 * d, y - 1, 37); put(x - 5 * d, y - 1, 36); put(x - 4 * d, y + 1, 36); put(x - 5 * d, y + 1, 35);
    return true;
  }

  return {
    name: '法师英雄', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.heart], HIT_POINT: [1, -16], EVENTS,
    deathKit: { mode: 'ash', at: T_ASH }, REVIVE: { dy: -14, ramp: R_PETAL, big: 1 },
    SFX: { body: 'flesh', how: 'dissolve', pal: 'nature', style: 'buff', w: 0.35 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
