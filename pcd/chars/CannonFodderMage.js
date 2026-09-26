// 炮灰法师（部队 · 自然 · 商人 · 优质 · 远程 640）：野法师那株长胖了——身体就是一颗紫红大洋葱（占全身 60%，头身一体，球茎尖顶就是头顶），
// 短粗小腿、短手从两侧伸出；顶上一簇 4 片叶的莲座叶冠、背上斜扛一只干葫芦种荚炮（炮口越过肩膀朝前上方）、腰间藤绳挂一只鼓鼓的秘晶钱袋；
// 球茎表皮的裂缝里透出紫粉色秘晶光（发光体）。
// 攻击 = 弯腰把背上的葫芦炮口压向前方，「砰」地抛出一颗硬种子，高抛物线落到目标；
// 技能 = 特性「早期收获」提前收获：裂缝一条条亮起、秘晶从地面汇聚进球茎、球茎鼓胀 → 顶部裂缝「啵」地张开喷出 10 颗秘晶 → 落地弹两下、冒金色「+」化成积分。
// 死亡 = 球茎从头顶一劈两半向两边倒下，中间滚出 6 颗秘晶。升级线：野法师（WildMage.js）→ 炮灰法师 → 法师英雄（MageHero.js）。
PCD.define('CannonFodderMage', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_BURST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, sfx } = E;
  const RD = Math.round, PX = parts.px;

  // ───── 元素：秘晶 · 粉晶金（coin 色阶为主），晶体本身点缀粉紫 ─────
  const R_EL = FXI.coin, EL = FXR[R_EL];
  const GEM_C = [21, 63, 43, 24];                                     // 秘晶：白高光 → 粉 → 淡紫 → 紫

  // ───── 材质 ─────
  const M = parts.mats(E, {
    skin: { r: ['#2a0f24', '#5e2352', '#9a3f7e', '#d07aa8'], band: 2 },   // 紫红洋葱皮（球茎身，面积最大）
    flesh: ['#3a3020', '#8c7d62', '#d8ccae', '#f4efe0'],                    // 洋葱肉（裂开后的切面）
    leaf: ['#13240c', '#2f5a1a', '#5f9a2c', '#a6d45a'],                    // 叶冠（沿用野法师的嫩黄绿）
    stem: 'green', gourd: 'sand', vine: 'wood', pouch: 'leather', ink: { r: 'ink', flat: 1 }, blush: 'pink',
    crack: { r: ['#2a0f24', '#7a3a8a', 63, 21], flat: 1 },                 // 裂缝里的秘晶光（发光体）
  });
  const BODY = { body: 'child', leg: 5, lw: 3, stride: 2, sw: 5 };
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(88, 46, 44, 41);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 4, 6, 9], rimRamp: EL, rimAll: 1, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['crack', 'ink', 'gourd', 'vine', 'pouch', 'leaf', 'stem', 'blush']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：ca = 葫芦炮仰角（度 / 5），前手护钱袋 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0,
    lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, st: 0, ca: 7, crw: 0, lit: 3, open: 0, bulge: 0, pz: 0, py: 0, psw: 0, split: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, ca) => ({ hx, hy, bhx, bhy, lean, ca });
  const K_IDLE = K(13, -5, -10, -7, 0, 7);        // 炮斜扛 35°，前手护钱袋
  const K_BOW = K(13, -6, -9, -10, 2, 3);         // 弯腰：炮口压向前方
  const K_FIRE = K(12, -6, -10, -10, 1, 5);       // 「砰」：后坐
  const K_CHARGE = K(14, -9, -12, -10, -1, 8);    // 蓄力：两手张开、后仰、球茎鼓起
  const K_CAST = K(14, -10, -12, -12, -1, 9);
  const K_HURT = K(11, -6, -11, -8, -1, 9);
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'ca'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -32, 15], ['bhx', -32, 31], ['bhy', -32, 15], ['lean', -1, 2], ['crouch', 0, 3], ['bob', 0, 1], ['ca', 0, 12], ['crw', 0, 3], ['lit', 0, 3], ['open', 0, 3], ['bulge', 0, 1],
    ['pz', 0, 1], ['py', 0, 2], ['psw', -1, 1], ['split', 0, 3]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 2], ['flash', 0, 1],
    ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8]]);
  const T_FIRE = 2 / 12, T_SPLIT = INCOMING + 0.66;
  // 待机个性（1.6–2.0 s，5 帧）：掂钱袋——托起颠两下，眯眼
  const PERS_PY = [1, 2, 0, 2, 0], PERS_EYE = [0, 2, 2, 2, 0];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.crouch = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.crw = 0; P.lit = 3; P.open = 0; P.bulge = 0; P.pz = 0; P.py = 0; P.psw = 0; P.split = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.psw = [0, 1, 0, -1][(b + 1) & 3] === 1 ? 1 : 0; P.crw = (Math.floor(TT * 1.25 + 1e-6) & 3) === 2 ? 3 : 0;
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { const i = Math.floor((lp - 1.6) * 12 + 1e-6); P.py = PERS_PY[i]; P.eyes = PERS_EYE[i]; P.hy = K_IDLE.hy + 1 - P.py; P.hx = K_IDLE.hx - 1; P.glint = i === 1 || i === 3 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                               // 蹒跚摇摆：球茎左右晃 1 格，钱袋每步甩一下
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f);
      P.lean = [1, 0, -1, 0][f]; P.psw = [-1, 0, 1, 0][f]; P.crw = [0, 3, 0, 3][f]; P.hx += [0, 0, -1, 0][f];
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_BOW, ease.out(tq / 0.12)); P.crw = 3; P.gem = 1; }
      else if (tq < 0.2) { setK(K_FIRE, K_FIRE, 0); P.bx = -1; P.crw = 1; P.psw = 1; P.gem = 2; }
      else if (tq < 0.45) { setK(K_FIRE, K_IDLE, ease.out((tq - 0.2) / 0.25) * 0.5); P.psw = -1; }
      else setK(K_FIRE, K_IDLE, 0.5 + 0.5 * ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {                                           // 裂缝一条条亮起 → 球茎鼓胀 1 格、叶冠竖起
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      P.lit = tq < 0.3 ? 0 : tq < 0.6 ? 1 : tq < 0.9 ? 2 : 3; P.bulge = tq >= 0.7 ? 1 : 0; P.crw = tq >= 0.4 ? 1 : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.eyes = tq > 0.9 ? 2 : 0; P.psw = q > 0.9 && (f12 & 1) ? 1 : 0;
    } else if (st === CAST) {                                             // 顶部裂缝「啵」地张开
      setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.open = tq < 1 / 12 ? 3 : tq < 0.3 ? 2 : 1; P.bulge = tq < 2 / 12 ? 1 : 0; P.crw = 1; P.gem = 3; P.rim = 3;
      P.eyes = 2; P.bob = tq < 1 / 12 ? 0 : 1;
    } else if (st === RECOVER) {                                          // 裂缝合拢、表皮暗下来、钱袋鼓大一格
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.open = q < 0.3 ? 1 : 0; P.pz = tq > 0.15 ? 1 : 0;
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.lit = q < 0.5 ? 3 : 0; P.eyes = q < 0.6 ? 2 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.crw = 2; P.psw = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.crw = 3; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                            // 裂成两瓣：头顶裂缝一劈两半 → 向两边倒下 → 滚出秘晶
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.crw = 2; P.psw = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.crw = 2; P.split = 1; P.crouch = 1; P.gem = (f12 & 1) ? 2 : 1; P.rim = 1; }
      else if (d < 0.66) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.crw = 2; P.split = 2; P.gem = 2; }
      else {
        P.split = 3; P.bx = -2; P.gem = d < 1.0 ? ((f12 & 1) ? 1 : 4) : 4; const hq = clamp01((d - 0.66) / 0.3); P.hatX = RD(-5 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 3);
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy) + P.bob + P.crouch; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + P.bob + P.crouch; P.lean = RD(P.lean); P.ca = RD(P.ca);
    if (P.split >= 3) { P.gx = P.bx; P.gy = -4; }
    else { P.gx = 1 + RD(P.lean * 0.8) + P.bx; P.gy = -14 + P.bob + P.crouch; }                  // 发光体 = 球茎里的秘晶光（胸口裂缝）
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画 ─────
  // 候选部件：bulbBody —— 头身一体的大球茎（18 行洋葱轮廓：尖顶、下半最宽 18 格），前倾只推上半截；脸、纵纹、秘晶裂缝画在同一部件
  const BW = [2, 2, 4, 6, 8, 10, 12, 14, 16, 17, 18, 18, 18, 17, 16, 14, 12, 8], NB = BW.length;
  const yRow = (i) => -21 + P.bob + P.crouch + i;
  function span(i) { const w = BW[i] + (P.bulge && i >= 3 && i <= 15 ? 2 : 0), sh = RD(P.lean * Math.pow(1 - i / (NB - 1), 1.3) * 1.6); const L = Math.floor(1 - w / 2) + sh; return [L, L + w - 1]; }
  const crackTone = (k) => { const lv = P.gem; if (lv === 4) return 1; if (k >= P.lit) return 2; return lv === 3 ? 4 : lv === 2 ? 4 : lv === 1 ? 3 : 2; };
  // 裂缝：0 胸口前下 · 1 左上 · 2 头顶（技能时张开的那条）
  const CRACKS = [[[11, 0.52], [12, 0.56], [13, 0.52], [14, 0.57]], [[5, 0.3], [6, 0.26], [7, 0.3]], [[1, 0.5], [2, 0.5], [3, 0.5], [4, 0.52]]];
  function bulbBody(T, half) {                                          // half：0 整颗 · -1 左半 · 1 右半（裂开时）
    E.part();
    const mid = (i) => { const s = span(i); return RD((s[0] + s[1]) / 2); };
    for (let i = 0; i < NB; i++) {
      const y = yRow(i), s = span(i); let L = s[0], Rr = s[1];
      if (half < 0) Rr = mid(i) - 1; else if (half > 0) L = mid(i) + 1;
      if (L > Rr) continue; const sh = half * (P.split === 2 ? RD((NB - 1 - i) / 6) : 0);
      parts.run(E, T, y, L + sh, Rr + sh, M.skin, 0);
      const w = s[1] - s[0] + 1;
      if (i >= 2 && i < NB - 1) {                                        // 纵纹 + 左上高光弧
        const a = s[0] + RD(w * 0.28), b = s[0] + RD(w * 0.68);
        if (a >= L && a <= Rr) PX(E, T, a + sh, y, M.skin, 2);
        if ((i < 6 || i > 11) && b >= L && b <= Rr) PX(E, T, b + sh, y, M.skin, 2);
        if (i >= 4 && i <= 9 && s[0] + 2 >= L && s[0] + 2 <= Rr) PX(E, T, s[0] + 2 + sh, y, M.skin, 4);
      }
      if (half !== 0) { const cx = half < 0 ? Rr + sh : L + sh; PX(E, T, cx, y, M.crack, P.gem === 4 ? 1 : (i + (P.gem & 1)) & 1 ? 3 : 4); }   // 裂口透出秘晶光
    }
    if (half === 0) {
      for (let k = 0; k < 3; k++) for (const [i, f] of CRACKS[k]) { const s = span(i), x = s[0] + RD((s[1] - s[0]) * f); PX(E, T, x, yRow(i), M.crack, crackTone(k)); }
      if (P.open) {                                                     // 顶部裂缝张开：V 形缺口，两沿发光
        for (let i = 0; i <= P.open; i++) { const x = mid(i + 1); for (let dx = -Math.max(0, P.open - i - 1); dx <= Math.max(0, P.open - i - 1); dx++) PX(E, T, x + dx, yRow(i), 0, 0); PX(E, T, x - (P.open - i), yRow(i + 1), M.crack, 4); PX(E, T, x + (P.open - i), yRow(i + 1), M.crack, 4); }
      }
      const s = span(7), ex = s[1] - 3, ey = yRow(7);                  // 脸：眼（1×2）、眯眼（^）、腮红、小嘴
      if (P.eyes === 1) { PX(E, T, ex, ey + 1, M.skin, 1); PX(E, T, ex - 1, ey + 1, M.skin, 1); }
      else if (P.eyes === 2) { PX(E, T, ex - 1, ey + 1, M.skin, 1); PX(E, T, ex, ey, M.skin, 1); PX(E, T, ex + 1, ey + 1, M.skin, 1); }
      else { PX(E, T, ex, ey, M.ink, 1); PX(E, T, ex, ey + 1, M.ink, 1); PX(E, T, ex + 1, ey, M.skin, 4); }
      PX(E, T, ex - 1, ey + 2, M.blush, 3); PX(E, T, ex + 1, ey + 3, M.skin, 1); PX(E, T, ex + 2, ey + 3, M.skin, 1);
    }
  }
  // 候选部件：gourdCannon —— 背负的干葫芦种荚炮（沿轴线按半径表刷圆：下葫芦 → 细腰藤绑 → 上葫芦 → 细颈 → 炮口），任意仰角都是圆形截面
  const GPROF = [[0, 3.4], [2, 3.1], [4, 2.1], [5.5, 1.5], [7.5, 2.3], [9, 2.0], [11, 1.2], [17, 1.1], [18.5, 1.6]];
  const gR = (d) => { for (let i = 1; i < GPROF.length; i++) if (d <= GPROF[i][0]) { const a = GPROF[i - 1], b = GPROF[i], q = (d - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * q; } return 1.6; };
  function gourdAxis(ca) { const a = ca * 5 * Math.PI / 180; return [Math.cos(a), -Math.sin(a)]; }
  function gourd(T, bx, by, ca) {
    const [dx, dy] = gourdAxis(ca); E.part();
    for (let d = 0; d <= 18.5; d += 0.5) parts.brush(E, T, bx + dx * d, by + dy * d, gR(d), M.gourd, 0);
    for (let k = -1; k <= 1; k++) PX(E, T, bx + dx * 5.5 - dy * k * 1.6, by + dy * 5.5 + dx * k * 1.6, M.vine, 3);             // 细腰藤绑
    PX(E, T, bx + dx * 19, by + dy * 19, M.gourd, 1); PX(E, T, bx + dx * 18.4 - dy, by + dy * 18.4 + dx, M.vine, 2);         // 炮口
    PX(E, T, bx - 1 + dx * 1, by - 2 + dy, M.gourd, 4); PX(E, T, bx + dx * 8 - 1, by + dy * 8 - 1, M.gourd, 4);             // 高光
    return [bx + dx * 19.5, by + dy * 19.5];
  }
  const GB = () => [-8 + RD(P.lean * 0.5), -9 + P.bob + P.crouch];
  // 候选部件：rosetteCrown —— 4 片叶的莲座叶冠（4 个姿态：0 舒展 · 1 竖起 · 2 蔫垂 · 3 甩动）
  const CRW = [
    [[1, 0], [2, -1], [3, -1], [3, -2], [4, -2], [5, -3], [1, -1], [1, -2], [2, -3], [2, -4], [0, -1], [0, -2], [-1, -3], [-1, -4], [0, 0], [-1, -1], [-2, -1], [-2, -2], [-3, -2], [-4, -3]],
    [[1, 0], [2, -1], [2, -2], [3, -3], [3, -4], [4, -5], [1, -1], [1, -2], [1, -3], [2, -4], [2, -5], [0, -1], [0, -2], [0, -3], [-1, -4], [-1, -5], [0, 0], [-1, -1], [-1, -2], [-2, -3], [-2, -4], [-3, -5]],
    [[1, 0], [2, 0], [3, 1], [4, 2], [5, 3], [1, -1], [2, -2], [3, -2], [0, -1], [-1, -2], [-2, -2], [0, 0], [-1, 0], [-2, 1], [-3, 2], [-4, 3]],
    [[1, 0], [2, 0], [3, -1], [4, -1], [5, -1], [6, -2], [1, -1], [1, -2], [1, -3], [2, -4], [0, -1], [-1, -2], [-1, -3], [-2, -4], [0, 0], [-1, -1], [-2, -2], [-2, -3], [-3, -4]],
  ];
  const CRW_TIP = [[5, 9, 13, 19], [5, 10, 15, 21], [4, 7, 10, 15], [5, 9, 13, 18]];
  function crown(T, bx, by, m) { E.part(); const s = CRW[P.crw]; for (let i = 0; i < s.length; i++) PX(E, T, bx + s[i][0], by + s[i][1], m, CRW_TIP[P.crw].includes(i) ? 4 : 0); }
  // 候选部件：coinPouch —— 腰间藤绳挂的鼓钱袋（束口 + 袋身 + 露出一颗秘晶；pz 鼓大一格，psw 甩动）
  function pouch(T, x, y, big) {
    E.part(); const w = 4 + big, h = 4 + big, sw = P.psw;
    parts.line(E, T, x - 3, y - 2, x, y - 1, M.vine, 3);
    PX(E, T, x + 1 + sw, y - 1, M.pouch, 3); PX(E, T, x + 2 + sw, y - 1, M.pouch, 3); PX(E, T, x + 1 + sw, y - 2, M.crack, 4);
    for (let j = 0; j < h; j++) { const ww = j === 0 || j === h - 1 ? w - 2 : w; const x0 = x + sw + RD((w - ww) / 2); parts.run(E, T, y + j, x0, x0 + ww - 1, M.pouch, 0); }
    PX(E, T, x + 1 + sw, y + 1, M.pouch, 4); PX(E, T, x + 2 + sw, y + 2, M.gourd, 3);
  }
  // 裂开后倒在地上的半颗球茎：碗形（弧面着地、切面朝上看得见一圈圈洋葱肉）
  function halfDown(T, cx, dir) {
    E.part();
    for (let y = -6; y <= 0; y++) { const q = (y + 6) / 6.5, hw = Math.max(1, RD(8 * Math.sqrt(Math.max(0, 1 - q * q)))); parts.run(E, T, y, cx - hw, cx + hw, M.skin, 0); if (y > -5 && y < -1) PX(E, T, cx - dir * RD(hw * 0.5), y, M.skin, 2); }
    E.part();
    for (let y = -8; y <= -6; y++) { const hw = y === -7 ? 8 : 6; for (let x = cx - hw; x <= cx + hw; x++) { const r = Math.abs(x - cx); PX(E, T, x, y, M.flesh, y === -7 && (r === 2 || r === 5) ? 2 : 0); } }
    PX(E, T, cx, -7, M.crack, P.gem === 4 ? 1 : 3);
  }
  function drawHero() {
    E.begin(hero, P.bx, 0);
    const R = parts.rig(P, BODY), F = parts.FREE;
    if (P.split >= 3) {                                                   // 两瓣倒在地上 + 葫芦炮滚在身后 + 钱袋掉在前面
      gourd(F, -12 + P.hatX, -3 - P.hatY, 36);
      halfDown(F, -9, -1); halfDown(F, 9, 1);
      crown(F, 10, -9, M.leafD);
      pouch(F, 18, -4, 0);
      return;
    }
    const gb = GB(); gourd(R, gb[0], gb[1], P.ca);
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.stemD, hand: M.stemD, from: [span(10)[0] + 2, yRow(10)] });
    parts.legs(E, R, P, { style: 'bare', mat: M.stem, matD: M.stemD, w: 3 });
    if (P.split === 0) bulbBody(R, 0); else { bulbBody(R, -1); bulbBody(R, 1); }
    E.part(); { const a = span(14), b = span(3); parts.line(E, R, a[0] + 3, yRow(14), b[1] - 1, yRow(3), M.vine, 3); PX(E, R, RD((a[0] + b[1]) / 2) - 1, yRow(9), M.leaf, 4); }   // 斜挎的藤背带 + 一片小叶结
    const top = span(0); crown(R, top[0] + (P.split === 2 ? 2 : 0), yRow(0) - 1, M.leaf);
    const b12 = span(13); pouch(R, b12[1] + 1, yRow(13) - P.py, P.pz);
    parts.arm(E, R, P, { sleeve: 'tight', mat: M.stem, hand: M.stem, from: [span(10)[1] - 1, yRow(10)] });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效：种子弹（高抛物线）、秘晶（弹跳 → 金色「+」→ 化成积分） ─────
  const G = 300, NG = 16, gX = new Float32Array(NG), gY = new Float32Array(NG), gVX = new Float32Array(NG), gVY = new Float32Array(NG), gB = new Uint8Array(NG), gT = new Float32Array(NG), gOn = new Uint8Array(NG), gRest = new Float32Array(NG);
  let sdT = 9, sdX0 = 0, sdY0 = 0, sdVX = 0, sdVY = 0, sdX = 0, sdY = 0, mzT = 9, mzX = 0, mzY = 0, chargeAcc = 0, soulAcc = 0, lastStep = 0, lastPers = -1, firstLand = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function gem(x, y, vx, vy) { for (let i = 0; i < NG; i++) if (!gOn[i]) { gOn[i] = 1; gX[i] = x; gY[i] = y; gVX[i] = vx; gVY[i] = vy; gB[i] = 0; gT[i] = 0; gRest[i] = -1; return; } }
  function muzzle() { const gb = GB(), a = gourdAxis(P.ca); return [wx(gb[0] + a[0] * 19.5 + P.bx), wy(gb[1] + a[1] * 19.5)]; }
  function onEnter(s) {
    if (s === CAST) {                                                    // 顶部裂缝喷泉：10 颗秘晶 + 十字星芒 + 小冲击环
      const x = wx(1 + P.bx), y = wy(-21 + P.bob); releaseOrbit(40, 90, 0.25, 0.5, { pts: 1, at: [x, y] });
      for (let i = 0; i < 10; i++) gem(x, y, -32 + i * 9 + Math.random() * 6, -65 - Math.random() * 30);
      fx.cross(x, y - 1, 7, R_EL, 0.35); ring(x, y, 0, R_EL); burst(x, y, 12, 30, 80, 0.2, 0.45, R_EL, 10); shake(0.28, 2); flash(0.05); firstLand = 1;
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FIRE) {                                  // 「砰」：高抛物线种子弹
      const m = muzzle(); mzT = 0; mzX = m[0]; mzY = m[1]; sdT = 0; sdX0 = m[0]; sdY0 = m[1]; const Tf = 0.42, tx = DUMMY_X - 1, ty = HY - 16;
      sdVX = (tx - sdX0) / Tf; sdVY = (ty - sdY0 - 0.5 * G * Tf * Tf) / Tf; sdX = sdX0; sdY = sdY0;
      burst(m[0], m[1], 6, 20, 50, 0.2, 0.4, FXI.dust, 6); sfx('swing', { kind: 'gun', w: 0.4 }); sfx('shoot', { proj: 'stone' });
    }
    if (s === DEATH && t === T_SPLIT) {                                  // 两瓣落地：尘土 + 滚出 6 颗秘晶
      for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 18 + Math.random() * 36, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.35 + Math.random() * 0.35, FXI.dust);
      for (let i = 0; i < 6; i++) gem(wx(-2 + i * 0.8), HY - 5, -40 + i * 16, -70 - Math.random() * 30);
      shake(0.12, 1); sfx('fall', { w: 0.45 });
    }
  }
  const EVENTS = [[], [], [T_FIRE], [], [], [], [], [T_SPLIT], []];
  function stepFX(dt, state, stT) {
    if (sdT < 0.42) {
      const n = sdT + dt; sdX = sdX0 + sdVX * n; sdY = sdY0 + sdVY * n + 0.5 * G * n * n;
      if ((E.stepN & 1) === 0) spawn(K_DUST, sdX, sdY, -sdVX * 0.1, 0, 0.18, FXI.dust);
      if (n >= 0.42) { burst(sdX, sdY, 10, 30, 80, 0.15, 0.35, FXI.impact, 10); burst(sdX, sdY, 5, 20, 60, 0.2, 0.4, FXI.earth, 12); hitDummy(0); sfx('hit', { mat: 'wood', w: 0.35 }); }
      sdT = n;
    }
    for (let i = 0; i < NG; i++) {
      if (!gOn[i]) continue; gT[i] += dt;
      if (gRest[i] >= 0) { gRest[i] += dt; if (gRest[i] > 0.7) gOn[i] = 0; else if ((E.stepN % 9) === 0) spawn(K_RISE, gX[i] + (Math.random() - 0.5) * 2, gY[i] - 2, 0, -18 - Math.random() * 10, 0.5, R_EL); continue; }
      gVY[i] += G * dt; gX[i] += gVX[i] * dt; gY[i] += gVY[i] * dt;
      if (gY[i] >= HY - 1) {
        gY[i] = HY - 1;
        if (gB[i] < 2) { gVY[i] *= -0.42; gVX[i] *= 0.6; gB[i]++; if (gB[i] === 1 && state !== DEATH) { spawn(K_BURST, gX[i], gY[i], 0, -20, 0.2, R_EL); if (firstLand) { firstLand = 0; shake(0.12, 1); sfx('impact', { pal: 'coin', w: 0.4 }); } } }
        else { gRest[i] = 0; fx.cross(gX[i], gY[i] - 2, 3, R_EL, 0.3); }
      }
    }
    mzT += dt;
    if (state === CHARGE && stT > 0.15) {                                 // 秘晶粒子从地面定点汇聚进球茎
      chargeAcc += dt * (12 + 20 * clamp01(stT / DUR[CHARGE]));
      const tx = wx(P.gx), ty = wy(P.gy);
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 14 + Math.random() * 8, a = 0.4 + Math.random() * 2.3; spawnX(K_SPIRAL_PT, tx, ty, (r - 3.5) / (0.4 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 4 + Math.random() * 3, tx, ty, squash: 0.6 }); }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.35 }); spawn(K_DUST, wx(P.step > 0 ? 3 : -3), HY, (Math.random() - 0.5) * 14, -3 - Math.random() * 4, 0.25, FXI.dust); } lastStep = P.step; }
    if (state === IDLE) {                                                 // 掂钱袋：秘晶叮当，蹦出两颗小亮点
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.6 && lp < 2.0 ? Math.floor((lp - 1.6) * 12 + 1e-6) : -1;
      if (f !== lastPers) { if (f === 1 || f === 3) { spawn(K_EMBER, wx(14), wy(-9), 6, -14, 0.35, R_EL); spawn(K_EMBER, wx(12), wy(-9), -4, -16, 0.35, R_EL); } lastPers = f; }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 36, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
  }
  function fxReset() { sdT = 9; mzT = 9; chargeAcc = 0; soulAcc = 0; lastStep = 0; lastPers = -1; firstLand = 0; gOn.fill(0); }
  function fxBack(f12) { if (P.split < 3 && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && P.split === 0 && P.dq < 1 && E.state !== ATTACK) { const L = P.gem === 3 ? 4 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : EL[1]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); } }
    if (sdT < 0.42) {                                                    // 种子弹：2×2 硬种子 + 亮边
      const x = RD(sdX), y = RD(sdY); put(x, y, 19); put(x + 1, y, 20); put(x, y + 1, 20); put(x + 1, y + 1, 20); put(x, y - 1, 62); put(x - 1, y, 62);
    }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY - r, r < 3 ? c : EL[2]); put(mzX + r, mzY, r < 2 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
    for (let i = 0; i < NG; i++) {                                        // 秘晶：菱形 4 格，粉紫，逐帧闪高光；落地后闪白消失
      if (!gOn[i]) continue; const x = RD(gX[i]), y = RD(gY[i]), r = gRest[i];
      if (r > 0.45 && (f12 & 1)) continue;
      const hi = r > 0.3 ? EL[0] : ((f12 + i) % 4 === 0 ? GEM_C[0] : GEM_C[1]);
      put(x, y - 1, hi); put(x - 1, y, GEM_C[1]); put(x, y, GEM_C[2]); put(x + 1, y, GEM_C[2]); put(x, y + 1, GEM_C[3]);
    }
  }

  return {
    name: '炮灰法师', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.crack], HIT_POINT: [1, -12], EVENTS,
    REVIVE: { dy: -11, ramp: 'coin' },
    SFX: { body: 'flesh', how: 'shatter', pal: 'coin', style: 'coin', w: 0.4 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
