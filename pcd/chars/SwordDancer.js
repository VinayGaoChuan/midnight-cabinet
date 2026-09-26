// 剑舞者（部队 · 骷髅 · 商人 · 稀有 · 近战）：细腰长腿、始终踮着脚尖的骷髅舞娘——头顶高发髻插一支金币簪，薄面纱从发髻后垂到腰；
// 短纱胸衣下露出脊椎和一根肋骨，腰间一圈沉甸甸的三层金币腰链裙（下摆外扩 14 格），后腰挂一只鼓鼓的钱袋；双手各握一把月牙短弯刀，刀尖向外。
// 攻击 = 扫：踮脚原地转一圈（侧 → 正 → 侧镜像 → 背 → 侧），两把刀先后横扫出两道扁弧（旋舞连斩）。
// 技能 = 特性「美味」（死亡后获得最大生命值 1% 的积分 · 死亡时掉落积分 · 金币）：踮脚原地加速旋转，腰链上的金币被甩脱、绕身体一圈圈环绕 →
//        猛地定格亮相、双刀交叉举过头，环绕的金币喷泉般抛出 → 金币落地弹两下、每枚落地闪一个金色「+」，最后在脚边聚成一小堆。
// 升级成「幻影舞者」（PhantomDancer.js）：同款高发髻金币簪 + 面纱（长成三条幽灵飘带）、同款金币腰链裙（幽灵币 + 燕尾），弯刀长成反握月牙镰。
PCD.define('SwordDancer', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_SPIRAL,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, sfx } = E;
  const RD = Math.round;

  // ───── 元素：美味 · 金币（白 → 淡金 → 金 → 暗金 → 棕）─────
  const R_EL = FXI.coin, EL = FXR[R_EL];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    gauze: 'sky',                                   // 孔雀青纱（胸衣、灯笼裤，小块 band 1）
    skirt: { r: 'sky', band: 2 },                   // 孔雀青纱裙（大面积 band 2）
    gold: 'gold',                                   // 金币腰链、垂币、护手、脚铃、臂钏
    veil: 'white',                                  // 薄面纱（隔点透）
    bone: 'bone',                                   // 骨
    steel: 'steel',                                 // 弯刀刃
    hair: [0, 0, 39, 40],                           // 墨青发髻
    pouch: 'leather',                               // 钱袋 / 刀柄
    sock: { r: [0, 0, 0, 0], flat: 1 },             // 眼窝、鼻孔
    eye: { r: [20, 14, 5, 21], flat: 1 },           // 眼窝金光 + 簪头金币（发光体，5 档）
  });
  const GEM_T = [2, 3, 4, 4, 1];                    // P.gem 0 待机 · 1 蓄力 · 2 蓄满 · 3 施放 · 4 熄灭 → 色调
  const BODY = { body: 'standard', leg: 12, torso: 8, head: 6, headW: 6, sw: 3, arm: 9, lw: 2, waist: 1, stride: 3, fall: 'back' };
  const SABER = { style: 'saber', metal: M.steel, trim: M.gold, wood: M.pouch, len: 6, w: 2, guard: 3 };
  const SABER_B = Object.assign({}, SABER, { hand: 'B', metal: M.steelD, trim: M.goldD });
  const HX = 78, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(64, 52, 32, 47);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['veil', 'hair', 'eye', 'sock', 'steel', 'pouch', 'gold']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手（右手）P.hx hy a，后手（左手）P.bhx bhy ba；spin 0 侧 · 1 正面 · 2 背面 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, prot: 0, dq: 0, st: 0, spin: 0, coin: 0, tuck: 0, shed: 0,
    chain: 0, veilOn: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, ba, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, ba, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(5, -13, 2.03, -5, -13, -2.03);                 // 双刀垂在身体两侧，刀尖向外向下
  const K_FLIP = K(5, -13, 2.03, 5, -19, -1.57);                  // 待机个性：左手刀夹在腋下，指骨弹金币
  const K_WIND = K(1, -17, -0.8, -3, -17, -1.2, -1, 0, 1);        // 预兆：双刀收到身后、屈膝
  const K_S1 = K(8, -15, 1.57, -6, -14, -1.9, 1);                 // 第一斩：右手刀水平扫出
  const K_SPREAD = K(8, -17, 1.57, -8, -17, -1.57);               // 正 / 背面：双臂平伸、双刀向两侧
  const K_S2 = K(3, -21, 0.4, 7, -12, 1.9, 1, 0, 1);              // 第二斩：左手刀低扫，右手刀举起
  const K_TWIRL = K(6, -21, 0.6, -6, -21, -0.6);                  // 蓄力：举臂旋转
  const K_POSE = K(2, -29, -0.78, -2, -29, 0.78, 0, 0, 0);        // 施放：双刀交叉举过头，定格亮相
  const K_HURT = K(3, -13, 2.6, -6, -15, -1.3, -1, -1);
  const K_STAG = K(3, -11, 2.8, -5, -12, -2.6, 1, 1, 2);          // 死亡：转身踉跄
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'ba', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B || A, q || 0, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -48, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -48, 15], ['ba', -32, 32, 1 / ASTEP],
    ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1], ['spin', 0, 2], ['coin', 0, 5], ['tuck', 0, 1], ['shed', 0, 3]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3],
    ['eyes', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3], ['hatX', -32, 31], ['hatY', -2, 15], ['prot', 0, 3], ['dq', 0, 48, 48], ['st', 0, 8],
    ['chain', 0, 1], ['veilOn', 0, 2], ['bx', -16, 15]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const COIN_SEQ = [0, 1, 2, 3, 4, 5, 0];                          // 待机个性：金币离手 → 翻 3 帧 → 接住
  const T_P0 = 1.5;
  const T_S1 = 2 / 12, T_S2 = 6 / 12, T_BREAK = INCOMING + 0.3, T_LAND = INCOMING + 0.66;
  // 攻击 9 帧：待机 · 预兆 · 第一斩（侧）· 正 · 侧镜像 · 背 · 第二斩（侧）· 收 · 收
  const ATK = [[K_IDLE, 0, 0], [K_WIND, 0, 0], [K_S1, 0, 0], [K_SPREAD, 1, 0], [K_S1, 0, 1], [K_SPREAD, 2, 0], [K_S2, 0, 0]];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.prot = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.spin = 0; P.coin = 0; P.tuck = 0; P.shed = 0; P.chain = 0; P.veilOn = 0;
    const idle = () => {
      setK(K_IDLE); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 0.4 && lp < 0.4 + 2 / 12) { P.gem = 1; P.glint = 1; }                   // 眼窝金光一闪
      if (lp >= T_P0 && lp < T_P0 + COIN_SEQ.length / 12) { setK(K_FLIP); P.tuck = 1; P.coin = COIN_SEQ[f12of(lp - T_P0)]; P.gem = P.coin === 3 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                               // 踮脚交叉舞步：接触 B 两腿在裙下交叉成 X，腰链一甩一甩，无尘
      setK(K_IDLE); const f = E.gait(tq); parts.gait(P, f); P.walk = 1;
      P.beard = -1 - (f & 1); P.sway = [-2, 0, 2, 0][f]; P.a += P.step * 0.1; P.ba -= P.step * 0.1; P.hx += P.step; P.bhx += P.step;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      const f = f12of(tq);
      if (f < ATK.length) { const k = ATK[f]; setK(k[0]); P.spin = k[1]; P.flip = k[2]; }
      else { const q = f === 7 ? 0.45 : 0.85; setK(K_S2, K_IDLE, q); }
      P.mx = f >= 2 && f <= 6 ? 3 : f === 7 ? 2 : f === 8 ? 1 : 0;
      P.gem = f === 1 ? 1 : f === 2 || f === 6 ? 2 : f >= 3 && f <= 5 ? 1 : 0; P.rim = f === 2 || f === 6 ? 2 : 1;
      P.beard = f === 1 ? 1 : f >= 2 && f <= 5 ? -3 : f === 6 ? 2 : 0; P.sway = f === 2 ? -2 : f === 6 ? 2 : f === 3 || f === 5 ? 1 : 0;
    } else if (st === CHARGE) {                                           // 踮脚原地加速旋转：前 0.7 s 每个朝向停 3 帧，之后每帧换一个朝向
      const q = ease.inOut(clamp01(tq / 0.7)), fi = f12of(tq), ori = tq < 0.7 ? Math.floor(fi / 3) & 3 : fi & 3;
      setK(K_IDLE, K_TWIRL, q);
      if (ori === 1 || ori === 3) { P.hx = RD(8 * q + 5 * (1 - q)); P.bhx = -P.hx; P.hy = P.bhy = RD(-13 - 6 * q); P.a = 1.57; P.ba = -1.57; P.spin = ori === 1 ? 1 : 2; }
      else P.flip = ori === 2 ? 1 : 0;
      P.shed = tq < 0.45 ? 0 : tq < 0.75 ? 1 : tq < 1.05 ? 2 : 3;
      P.beard = q > 0.5 ? -3 : -RD(q * 4); P.sway = (fi & 1) ? 2 : 1; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) { setK(K_POSE); P.gem = 3; P.rim = 3; P.beard = -1; P.sway = -1; P.shed = 3; P.glint = tq < 0.25 ? 1 : 0; }
    else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_POSE, K_IDLE, q); P.beard = RD(-1 + q); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.shed = q < 0.85 ? 3 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 2; P.sway = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                            // 旋转倒下：受击 → 原地转半圈 → 腰链断开、金币撒一地、钱袋翻滚 → 侧身倒地 → 面纱覆身 → 消散
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 1 / 12) { setK(K_HURT); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = 1; }
      else if (d < 0.17) { setK(K_HURT); P.bx = -2; P.eyes = 1; P.beard = 2; P.crouch = 1; P.gem = 1; }
      else if (d < 0.25) { setK(K_SPREAD); P.hy = P.bhy = -15; P.spin = 1; P.bx = -1; P.eyes = 1; P.crouch = 1; P.beard = -2; P.sway = 2; }
      else if (d < 0.5) { setK(K_STAG); P.flip = 1; P.eyes = 1; P.crouch = d < 0.42 ? 2 : 3; P.beard = 1; P.sway = -1; P.gem = (f12 & 1) ? 1 : 0; }
      else {
        setK(K_STAG); P.flip = 1; P.lying = 1; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        P.veilOn = d < 1.0 ? 0 : d < 1.1 ? 1 : 2;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
      if (d >= 0.3) {                                                    // 腰链断开：钱袋从后腰掉下、翻滚着落地
        P.chain = 1; const fq = clamp01((d - 0.3) / 0.45);
        P.hatX = RD(-11 * fq); P.hatY = RD((1 - fq) * 9 + Math.sin(fq * Math.PI) * 3); P.prot = fq < 1 ? Math.floor(fq * 5) & 3 : 1;
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.a = RD(P.a / ASTEP) * ASTEP; P.ba = RD(P.ba / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.lying) { P.gx = P.bx; P.gy = -4; }
    else if (st === CAST) { P.gx = P.bx; P.gy = P.hy - 4; }
    else { P.gx = P.bx; P.gy = -14 + yo; }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  const px = (T, x, y, m, t) => parts.px(E, T, x, y, m, t), run = (T, y, a, b, m, t) => parts.run(E, T, y, a, b, m, t);

  // 候选部件：veilTail 发髻后垂到腰的薄面纱——2–3 格宽，从发髻后出发逐行往下、往后飘（P.beard < 0 被风吹起：飘出最多 5 格，beard −3 时整条水平飘起），
  //   内部隔点透（空格由选择性勾线补成暖灰，读成纱），末端 2 行随 sway 摆；center = 1 背面（面纱直直垂在背上，画在躯干之后）。读 P.beard P.sway。一个部件
  function veilTail(R, center) {
    E.part(); const b = RD(P.beard || 0), sw = RD(P.sway || 0);
    const x0 = center ? R.hx + 1 : R.hx0 - 1, y0 = R.htop, L = R.yWaist + 2 - y0, hz = center ? 0 : clamp01((-b - 1) / 2);
    const drift = center ? 0 : 2 + Math.max(0, -b) - (b > 0 ? 1 : 0);
    for (let k = 0; k <= L; k++) {
      const q = k / L, hangX = x0 - drift * Math.pow(q, 1.1) - (b > 0 ? -b * q * q : 0), hangY = y0 + k;
      const horX = x0 - k * 0.95, horY = y0 + 1 + k * 0.28 + Math.sin(k * 0.9 + sw) * 0.6;
      const cx = RD(hangX * (1 - hz) + horX * hz + (k >= L - 1 ? sw * (1 - hz) : 0)), cy = RD(hangY * (1 - hz) + horY * hz);
      const w = k < 3 ? 1 : 2;
      for (let i = 0; i < w; i++) {
        const x = hz > 0.5 ? cx : cx - i + (center ? 1 : 0), y = hz > 0.5 ? cy + i - 1 : cy;
        if (i > 0 && ((x + y) & 1)) continue;                                // 隔点透
        px(R, x, y, M.veil, i === 0 ? 4 : 0);
      }
    }
  }
  // 候选部件：tiptoeLegs 踮脚灯笼裤腿——大腿到小腿是鼓起的灯笼裤（中段宽 3、上下 2），裤脚收成一圈金色脚铃，
  //   露出 2 格细骨小腿，脚背绷直、只有脚尖 1 格点地（向前斜出 1 格）。cross = 1 时接触 B 两条腿不换胯位（交叉舞步，腿在裙下交叉成 X）。
  //   远侧腿用 D 材质。读 rig 的步态 / 蹲。两个部件（远 → 近）
  function tiptoeLegs(R, cross) {
    for (const B of [1, 0]) {
      const hx = cross ? (B ? R.hipBx : R.hipFx) : (B ? R.legBx : R.legFx), fx = B ? R.footBx : R.footFx, up = B ? R.footBup : R.footFup;
      const pm = B ? M.gauzeD : M.gauze, bm = B ? M.boneD : M.bone, gm = B ? M.goldD : M.gold;
      const h0 = R.yHip + 1, yb = -up, n = Math.max(1, yb - h0), kn = R.cr * 0.9 + (up ? 0.8 : 0);
      E.part();
      let c = fx;
      for (let y = h0; y <= yb - 1; y++) {
        const t = (y - h0) / n; c = RD(hx + (fx - hx) * t + kn * Math.sin(t * Math.PI));
        if (y <= yb - 4) { const w = t > 0.3 && t < 0.8 ? 3 : 2; run(R, y, c - 1, c - 2 + w, pm, 0); }
        else if (y === yb - 3) { px(R, c - 1, y, gm, 2); px(R, c, y, gm, 4); px(R, c + 1, y, gm, 3); }   // 脚铃
        else px(R, c, y, bm, y === yb - 1 ? 4 : 0);
      }
      px(R, c + 1, yb, bm, 3);                                            // 脚尖点地
    }
  }
  // 候选部件：bodiceRibs 短胸衣 + 露骨细腰——肩下 3 行纱胸衣（前沿一枚金币坠），下面一行肋骨、一行只剩脊椎（骷髅细腰露在外面）。一个部件
  function bodiceRibs(R) {
    E.part();
    for (let y = R.yS; y < R.yWaist; y++) {
      const e = parts.edges(R, y), k = y - R.yS;
      if (k < 3) run(R, y, e[0], e[1], M.gauze, 0);
      else if (k === 3) { run(R, y, e[0], e[1], M.bone, 0); px(R, e[1], y, M.bone, 2); }
      else { px(R, e[0], y, M.bone, 3); px(R, e[0] + 1, y, M.bone, 2); }
    }
    const e = parts.edges(R, R.yS + 1); px(R, e[1], R.yS + 1, M.gold, 4); px(R, e[1] - 1, R.yS + 2, M.gauze, 2);
  }
  // 候选部件：coinSkirt 金币腰链裙——腰上一圈亮暗交替的金链，纱裙从腰往下外扩成钟形（下摆宽 o.w 格），裙面三层垂币（每 2 格一枚，
  //   亮暗随 P.beard 相位换 = 叮当晃），下摆每 3 格垂一枚币出轮廓；o.shed 从下往上少画几层（被甩脱），o.broken 腰链断开只剩纱。读 P.sway P.beard。一个部件
  function coinSkirt(R, o) {
    E.part();
    const yW = R.yWaist, hem = Math.min(-2, o.hem), n = hem - yW, sw = RD(P.sway || 0), jb = RD(P.beard || 0) & 1, LL = [], RR = [];
    for (let y = yW; y <= hem; y++) {
      const t = (y - yW) / n, s = RD(sw * t * t), half = 2 + (o.w / 2 - 2) * Math.pow(t, 1.15);
      const L = RD(-0.5 - half + s), Rr = RD(-0.5 + half + s - 0.4);
      LL.push(L); RR.push(Rr); run(R, y, L, Rr, M.skirt, 0);
    }
    for (let i = 2; i < n; i++) { const y = yW + i, t = i / n; px(R, LL[i] + 2 + RD(t), y, M.skirt, 2); if (t > 0.45) px(R, RD((LL[i] + RR[i]) / 2) + 1, y, M.skirt, 2); }
    for (let x = LL[n] + 1; x < RR[n]; x++) if ((((x - sw) % 3) + 3) % 3 === 1) px(R, x, hem, M.skirt, 1);   // 下摆波浪
    if (o.broken) { px(R, LL[0] + 1, yW, M.skirt, 2); return; }
    for (let x = LL[0]; x <= RR[0]; x++) px(R, x, yW, M.gold, ((x + jb) & 1) ? 4 : 2);                      // 腰链
    const tiers = [yW + 3, yW + 6, hem].slice(0, 3 - (o.shed || 0));
    for (const ty of tiers) { const i = ty - yW; for (let x = LL[i] + 1 + (ty & 1); x < RR[i]; x += 2) px(R, x, ty, M.gold, ((x + jb + ty) % 3) === 0 ? 4 : 3); }
    if (!o.shed) for (let x = LL[n]; x <= RR[n]; x++) if ((((x - sw) % 3) + 3) % 3 === 0) px(R, x, hem + 1, M.gold, jb ? 3 : 4);   // 下摆垂币
  }
  // 候选部件：coinPouch 鼓鼓的钱袋——金色束口 + 一枚冒出袋口的金币，4 行鼓肚皮袋，袋面一枚金币印；T 可以是 rig（挂在腰上）或自建的 90° 翻滚落笔。一个部件
  function coinPouch(T, x, y) {
    E.part();
    px(T, x, y, M.gold, 4); px(T, x + 1, y, M.gold, 3);                                           // 冒出袋口的金币
    run(T, y + 1, x - 1, x + 1, M.gold, 2);                                                        // 束口绳
    run(T, y + 2, x - 2, x + 1, M.pouch, 0); run(T, y + 3, x - 2, x + 2, M.pouch, 0); run(T, y + 4, x - 2, x + 2, M.pouch, 0); run(T, y + 5, x - 1, x + 1, M.pouch, 0);
    px(T, x, y + 3, M.gold, 3); px(T, x - 2, y + 2, M.pouch, 4);
  }
  // 骷髅头（侧面）：眼窝 2 格 + 眼窝里的金光（发光体）、眉骨、鼻孔、牙排、颧骨凹——都在脸的同一个部件里
  function skullSide(R) {
    const h = parts.head(E, R, P, { mat: M.bone, face: 'gaunt', eye: M.sock, eyeStyle: 'narrow', nose: 'none', mouth: 'none', ear: 'none' });
    if (!P.eyes) px(R, h.eye[0], h.ey, M.eye, GEM_T[P.gem]);
    px(R, h.x1, h.ey + 2, M.sock, 1);                                                              // 鼻孔
    px(R, h.x1, h.bot, M.bone, 4); px(R, h.x1 - 1, h.bot, M.sock, 1); px(R, h.x1 - 2, h.bot, M.bone, 4);   // 牙排
    px(R, h.x0 + 2, h.ey + 1, M.bone, 2);
    parts.hair(E, R, P, { style: 'short', mat: M.hair });
  }
  // 候选部件：skullFront 骷髅头正面——两个眼窝各 1 格金光、鼻孔居中、下颌一排牙（旋转的正面帧用）；back = 1 背面：整颗后脑盖满发（没有脸）。一个部件
  function skullFront(R, back) {
    E.part(); const x0 = R.hx0, x1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey;
    for (let y = top; y <= bot; y++) { const edge = y === top || y === bot; run(R, y, x0 + (edge ? 1 : 0), x1 - (edge ? 1 : 0), back && y <= ey + 2 ? M.hair : M.bone, 0); }
    if (back) { px(R, x0 + 2, top + 1, M.hair, 4); px(R, x0 + 1, ey + 3, M.bone, 2); return; }
    run(R, ey - 1, x0 + 1, x1 - 1, M.bone, 2);
    for (const x of [x0 + 1, x1 - 1]) px(R, x, ey, P.eyes ? M.sock : M.eye, P.eyes ? 1 : GEM_T[P.gem]);
    px(R, x0 + 2, ey, M.sock, 1); px(R, x1 - 2, ey, M.sock, 1);
    px(R, RD((x0 + x1) / 2), ey + 2, M.sock, 1);
    for (let x = x0 + 1; x <= x1 - 1; x++) px(R, x, bot, (x & 1) ? M.bone : M.sock, (x & 1) ? 4 : 1);
    run(R, top - 1, x0 + 1, x1 - 1, M.hair, 0);
  }
  // 候选部件：highBun 高发髻 + 金币簪——头顶偏后一个 4 行高的发髻（最上一行收窄），一根金簪从发髻后上方斜插出来，簪头一枚 2×2 金币
  //   （发光体，按 P.gem 5 档，P.glint 闪白一格）。center = 1 正 / 背面（发髻居中）。两个部件：发髻 → 金币簪
  function highBun(R, center) {
    E.part(); const bx = center ? R.hx - 2 : R.hx0, t = R.htop;
    run(R, t - 1, bx - 1, bx + 3, M.hair, 0); run(R, t - 2, bx - 1, bx + 3, M.hair, 0); run(R, t - 3, bx - 1, bx + 3, M.hair, 0); run(R, t - 4, bx, bx + 2, M.hair, 0);
    px(R, bx, t - 3, M.hair, 4); px(R, bx + 2, t - 2, M.hair, 2); px(R, bx + 1, t - 1, M.gold, 3);
    E.part(); const g = GEM_T[P.gem];
    px(R, bx - 2, t - 4, M.gold, 3);
    px(R, bx - 4, t - 6, M.eye, P.gem === 4 ? 1 : 4); px(R, bx - 3, t - 6, M.eye, g); px(R, bx - 4, t - 5, M.eye, g); px(R, bx - 3, t - 5, M.eye, P.gem === 4 ? 1 : 2);
    if (P.glint) px(R, bx - 5, t - 7, M.eye, 4);
  }
  // 候选部件：veilDrape 盖在倒地身体上的面纱——隔点透的白纱从胸口铺到胯下（level 1 盖上半、2 盖全身），落在身体轮廓外沿垂下 1 格。一个部件
  function veilDrape(R, level) {
    E.part(); const y0 = R.htop + 1, y1 = level > 1 ? R.yHip + 3 : R.yWaist;
    for (let y = y0; y <= y1; y++) { const e = parts.edges(R, Math.min(Math.max(y, R.yS), R.yHip)), L = e[0] - 1, Rr = e[1] + 2; for (let x = L; x <= Rr; x++) if (x === L || x === Rr || ((x + y) & 1)) px(R, x, y, M.veil, x === L ? 4 : 0); }
  }
  // 指骨上翻飞的金币（待机个性）：1 / 3 / 5 正面 2×1，2 / 4 侧面 1 格
  const COIN_DY = [0, 2, 5, 6, 5, 2];
  function flipCoin() {
    if (!P.coin) return; E.part(); const x = P.bhx, y = P.bhy - 2 - COIN_DY[P.coin];
    if (P.coin & 1) { px(parts.FREE, x, y, M.gold, 4); px(parts.FREE, x + 1, y, M.gold, 3); } else px(parts.FREE, x, y, M.eye, 4);
  }

  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY), sp = P.spin;
    if (sp !== 2) veilTail(R, 0);
    if (!R.lie) { if (P.tuck) parts.sword(E, R, P, Object.assign({}, SABER_B, { at: [0, R.yS + 3], a: -Math.PI / 2 })); else parts.sword(E, R, P, SABER_B); }
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.boneD, cuff: M.goldD, hand: M.boneD, grip: 'fist' });
    tiptoeLegs(R, P.walk);
    bodiceRibs(R);
    coinSkirt(R, { hem: R.yHip + 5, w: 14, shed: P.shed, broken: P.chain });
    if (!P.chain) coinPouch(R, parts.edges(R, R.yWaist)[0] - 2, R.yWaist + 1);
    if (sp === 0) skullSide(R); else skullFront(R, sp === 2);
    highBun(R, sp !== 0);
    if (sp === 2) veilTail(R, 1);
    if (R.lie) {                                                           // 倒地：双刀散在地上
      parts.sword(E, parts.FREE, P, Object.assign({}, SABER, { free: 1, at: [13, -1], a: Math.PI / 2, glowLv: 4 }));
      parts.sword(E, parts.FREE, P, Object.assign({}, SABER_B, { free: 1, at: [-15, -2], a: -Math.PI / 2, glowLv: 4 }));
    } else parts.sword(E, R, P, SABER);
    parts.arm(E, R, P, { sleeve: 'tight', mat: M.bone, cuff: M.gold, hand: M.bone, grip: 'fist' });
    if (P.chain) coinPouch({ r0: P.prot, tx: -5 + P.hatX, ty: -3 - P.hatY + (P.lying ? 0 : 0), rot: 0, ox: 0, oy: 0 }, 0, -3);
    if (P.veilOn) veilDrape(R, P.veilOn);
    flipCoin();
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  // 金币（技能甩出 / 死亡撒落）：2×1 正面 ↔ 1 格侧面翻转、落地弹两下；技能里的最后滑进脚边的币堆。固定 14 枚，状态 0 空 · 1 环绕 · 2 飞 · 3 滑向币堆 · 4 静止
  const CN = 14, cS = new Uint8Array(CN), cX = new Float32Array(CN), cY = new Float32Array(CN), cVX = new Float32Array(CN), cVY = new Float32Array(CN);
  const cA = new Float32Array(CN), cR = new Float32Array(CN), cB = new Uint8Array(CN), cTX = new Float32Array(CN), cTY = new Float32Array(CN), cAge = new Float32Array(CN);
  const PILE = [[5, 0], [7, 0], [9, 0], [11, 0], [6, -1], [8, -1], [10, -1], [7, -2], [9, -2], [8, -3], [3, 0], [13, 0], [12, -1], [4, -1]];
  let arcT = 9, arcY = 0, arcBig = 0, orbitAcc = 0, sparkAcc = 0, soulAcc = 0, lastF = -1, firstLand = 0, pileDone = 0, coinMode = 0, coinFade = 9;
  const G = 520;
  function coinsClear() { cS.fill(0); firstLand = 0; pileDone = 0; coinFade = 9; }
  function onEnter(s) {
    if (s === CHARGE) { coinsClear(); coinMode = 1; }
    if (s === CAST) {                                                     // 定格亮相：环绕的金币喷泉般抛出，十字星芒，天空闪白
      const cx = scrX(0), cy = HY - 32;
      for (let i = 0; i < CN; i++) if (cS[i] === 1) { cS[i] = 2; cVX[i] = 14 + (PILE[i][0] - 8) * 2.5 + (Math.random() - 0.5) * 12; cVY[i] = -95 - Math.random() * 45; cB[i] = 0; cTX[i] = HX + PILE[i][0]; cTY[i] = HY + PILE[i][1]; cAge[i] = 0; }
      releaseOrbit(40, 90, 0.3, 0.6, { up: 30 });
      fx.cross(cx, cy, 6, R_EL, 0.3); burst(cx, cy, 18, 40, 110, 0.25, 0.6, R_EL, 20); ring(cx, cy + 2, 1, R_EL);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && (Math.abs(t - T_S1) < 1e-9 || Math.abs(t - T_S2) < 1e-9)) {   // 两道横扫扁弧，先高后低
      const two = Math.abs(t - T_S2) < 1e-9; arcT = 0; arcY = HY - (two ? 11 : 15); arcBig = two ? 1 : 0;
      const hx = DUMMY_X - 3, hy = arcY - 1; fx.cross(hx, hy, 4, R_EL, 0.2); burst(hx, hy, 8, 40, 100, 0.15, 0.35, FXI.impact, 8); burst(hx, hy, 4, 30, 70, 0.15, 0.3, R_EL, 6);
      hitDummy(0); sfx('swing', { kind: 'slash', w: 0.3 }); sfx('hit', { mat: 'flesh', w: 0.3 });
    }
    if (s === DEATH && Math.abs(t - T_BREAK) < 1e-9) {                    // 腰链断开：金币撒一地
      coinsClear(); coinMode = 2;
      for (let i = 0; i < 10; i++) { cS[i] = 2; cX[i] = scrX(-4 + Math.random() * 8); cY[i] = HY - 10 - Math.random() * 3; cVX[i] = (Math.random() - 0.5) * 110; cVY[i] = -50 - Math.random() * 60; cB[i] = 0; cTX[i] = -1; cAge[i] = 0; }
      burst(scrX(0), HY - 11, 8, 30, 80, 0.15, 0.35, R_EL, 10); sfx('hit', { mat: 'metal', w: 0.25 });
    }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) {
      for (let i = 0; i < 14; i++) spawn(K_DUST, scrX(-14 + Math.random() * 26), HY - 1, (Math.random() - 0.5) * 26, -6 - Math.random() * 10, 0.4 + Math.random() * 0.35, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.3 });
    }
  }
  const EVENTS = [[], [], [T_S1, T_S2], [], [], [], [], [T_BREAK, T_LAND], []];
  function stepCoins(dt, state, stT) {
    const ocx = scrX(0), ocy = HY - 14;
    if (state === CHARGE) {                                               // 腰链金币一枚枚被甩脱，绕着身体越转越快
      for (let i = 0; i < 12; i++) if (!cS[i] && stT >= 0.3 + i * 0.075) { cS[i] = 1; cA[i] = i * 2.4; cR[i] = 3; }
    }
    for (let i = 0; i < CN; i++) {
      const s = cS[i]; if (!s) continue; cAge[i] += dt;
      if (s === 1) {
        const w = 5 + 11 * clamp01(stT / DUR[CHARGE]); cA[i] += w * dt; cR[i] = Math.min(9 + (i & 1), cR[i] + dt * 18);
        cX[i] = ocx + Math.cos(cA[i]) * cR[i]; cY[i] = ocy + Math.sin(cA[i]) * cR[i] * 0.4 - (i % 3);
      } else if (s === 2) {
        cVY[i] += G * dt; cX[i] += cVX[i] * dt; cY[i] += cVY[i] * dt;
        if (cY[i] >= HY) {
          cY[i] = HY;
          if (cB[i] === 0) { fx.cross(RD(cX[i]), HY - 3, 2, R_EL, 0.17); if (!firstLand) { firstLand = 1; sfx('impact', { pal: 'coin', w: 0.3 }); } }
          if (cB[i] < 2) { cVY[i] = -cVY[i] * (cB[i] ? 0.3 : 0.45); cVX[i] *= 0.55; cB[i]++; }
          else { cVX[i] = 0; cVY[i] = 0; cS[i] = cTX[i] >= 0 ? 3 : 4; }
        }
      } else if (s === 3) {                                               // 滑进脚边的币堆
        const dx = cTX[i] - cX[i], dy = cTY[i] - cY[i], d = Math.hypot(dx, dy);
        if (d < 1) { cX[i] = cTX[i]; cY[i] = cTY[i]; cS[i] = 4; } else { const v = Math.min(d, 70 * dt); cX[i] += dx / d * v; cY[i] += dy / d * v; }
      }
    }
    if (coinMode === 1 && firstLand && !pileDone) { let all = true, any = false; for (let i = 0; i < CN; i++) { if (cS[i]) any = true; if (cS[i] && cS[i] !== 4) all = false; } if (any && all) { pileDone = 1; coinFade = 0; burst(HX + 8, HY - 2, 10, 20, 60, 0.2, 0.45, R_EL, 18); sfx('impact', { pal: 'coin', w: 0.2 }); } }
    coinFade += dt;
  }
  function stepFX(dt, state, stT) {
    stepCoins(dt, state, stT);
    if (state === MOVE) {                                                 // 每步脚铃「叮」一下：脚踝一粒金光，不扬尘
      const f = E.gait(q12(stT));
      if (f !== lastF) { if (f === 0 || f === 2) { sfx('step', { w: 0.15 }); spawn(K_EMBER, scrX(f === 0 ? 5 : -4), HY - 3, 0, -10, 0.35, R_EL); } lastF = f; }
    } else lastF = -1;
    if (state === CHARGE) { sparkAcc += dt * (8 + 18 * clamp01(stT / DUR[CHARGE])); while (sparkAcc >= 1) { sparkAcc -= 1; const r = 10 + Math.random() * 6, a = Math.random() * 6.2832; spawn(K_SPIRAL, scrX(P.gx), HY + P.gy, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 4); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, scrX(-12 + Math.random() * 24), HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    arcT += dt;
  }
  function fxReset() { coinsClear(); coinMode = 0; arcT = 9; orbitAcc = 0; sparkAcc = 0; soulAcc = 0; lastF = -1; }
  function coinFadeDq() {
    if (coinMode === 2) return E.state === DEATH ? clamp01((E.stT - INCOMING - 1.6) / 0.8) : 1;
    if (!pileDone) return 0; return clamp01((coinFade - 0.55) / 0.35);
  }
  function drawCoin(i, f12, dq) {
    const x = RD(cX[i]), y = RD(cY[i]) - 1;
    if (dq > 0 && B8[((y + 64) & 7) * 8 + ((x + 64) & 7)] < dq * 1.05) return;
    if (cS[i] === 4) { put(x, y, 5); put(x + 1, y, 14); if (((f12 + i * 5) % 17) === 0) put(x, y, 21); return; }
    const ph = (i + f12) % 3;
    if (ph === 1) put(x, y, 5); else { put(x, y, ph === 0 ? 5 : 14); put(x + 1, y, ph === 0 ? 14 : 19); }
    if (cS[i] === 1 && ((f12 + i) % 5) === 0) put(x, y - 1, 21);           // 环绕时的闪光
  }
  function fxBack(f12) {
    if (!P.lying) floorGlow(scrX(P.gx), P.rim, EL, f12);
    for (let i = 0; i < CN; i++) if (cS[i] === 1 && Math.sin(cA[i]) < 0) drawCoin(i, f12, 0);   // 环绕到身后的那半圈
  }
  function fxFront(f12) {
    const dq = coinFadeDq();
    for (let i = 0; i < CN; i++) if (cS[i] && !(cS[i] === 1 && Math.sin(cA[i]) < 0)) drawCoin(i, f12, dq);
    if (arcT < 2 / 12) {                                                  // 旋舞斩：绕身一圈的扁椭圆弧，前半圈在身前
      const first = arcT < 1 / 12, cx = HX + 3 + (arcBig ? 1 : 0), rx = 17, ry = 4;
      for (let k = 0; k <= 40; k++) {
        const ph = -2.3 + 4.6 * k / 40, x = RD(cx + Math.sin(ph) * rx), y = RD(arcY + Math.cos(ph) * ry);
        if (Math.cos(ph) < -0.35) continue; if (!first && (k & 1)) continue;
        put(x, y, first ? (k > 30 ? EL[0] : EL[1]) : EL[2]); if (first && Math.cos(ph) > 0.2) put(x, y - 1, EL[2]);
      }
    }
  }

  return {
    name: '剑舞者', HX, R_EL, R_HURT: FXI.dust, DUR, hero, P, GLOW_MATS: [M.eye], HIT_POINT: [0, -16], EVENTS,
    SFX: { body: 'stone', how: 'topple', pal: 'coin', style: 'coin', w: 0.3 },
    REVIVE: { dy: -16, ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront,
  };
});
