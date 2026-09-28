// 院长（最终首领，第六章「深夜医院」的手术室）：照 B_demon.js 的最终首领契约做。
// 依据：附录 G「院长（四只手、额镜、手术刀）」；手术刀（被动：目标越残下手越重）、开刀（斩杀生命低于 40% 的单位）、横切 → 缝合（最前面的和最脆的缝在一起 8 秒）。
// 设定卡 ——
//   剪影：从血池里升起的骷髅医生上半身（原点 = 血面），四只手像扇子一样张开，每只手里一把手术刀（识别点一：四臂四刀的扇形剪影）。
//         一颗大骷髅头，额头上一根头带顶着一面圆圆的额镜（识别点二：比眼眶还大的银色圆盘，一闪一闪反着手术灯的冷光），
//         两个黑眼眶里各一点冷蓝的光；头上一顶绿色的手术帽，后脑扎着结。
//   身体：绿色手术衣溅满了血、V 领里露出锁骨和胸骨，脖子上挂着听诊器；上面一对手臂穿着袖子、袖口卷到肘上，
//         下面一对是从衣服的破洞里伸出来的光骨头胳膊；四只手都戴着蓝灰的橡胶手套。
//   主色：暗绿手术衣、骨白、蓝灰手套、刀钢；光是冷蓝（眼、刀刃、额镜的反光）和血池映上来的红；第二阶段胸口的衣服撕开，肋骨里一颗缝着线的红心在跳。
//   招式（setMove）：operate 开刀 · cut 横切 · stitch 缝合 · poke 重击 · rise 升起 · p2 第二阶段仪式；hot1 / hot0 第二阶段的样子常亮。
//     开刀：上面两只手把刀举过头交叉成 X、下面两只手张开，低头、额镜越来越亮，一道冷光打在病人身上 → 四把刀一齐往前下劈（四道斩弧、血花）。
//     横切：四只手全拧到身后、刀尖朝后，上身后仰 → 往前一扫，四把刀在身前排成一把扇子（四道横弧一层层）。
//     缝合：近侧的上手换一根大弯针、远侧的上手把发光的缝线往后拉直，像拉弓 → 往前一甩，线飞出去。
//     重击：一把刀举过肩、刀尖朝前下 → 扎进血池（血浪、飞溅）。普攻：下面那只手往前一划。
//     待机个性：额镜反光扫过一道；两把刀在脸前面互相刮一刮（磨刀、火星）；歪头、下巴咔哒咔哒。
//     升起：拿四把刀当冰镐扎进血里一把一把爬出来 → 四臂全张、仰头无声地嚎。
//     第二阶段：四只手抱住胸口、两声心电「嘀」→ 一把撕开手术衣，肋骨里一颗缝过的红心亮起来，四臂全张。
//     死亡：四臂朝天乱抓 → 四把刀一齐脱手掉进血里、心电拉成长音 → 骷髅头一歪、下巴掉开，整副骨架沉回血池，额镜最后一闪。
PCD.define('B_surgeon', (E) => {
  const { defDeep, defMat, ramp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, DRAMP = E.DRAMP;

  // ───── 材质（11 级，暗 → 亮）：手套用共用的 stormcoat（蓝灰橡胶）、刀和额镜用 bladesteel、眼眶和头带用 obsidian、血渍用 hellhide；
  //       自己的只有骨白、暗绿手术衣，和两条光（冷蓝、心脏的红，红和护士长的药水同色）─────
  const R_BONE = ['#0c0a08', '#1e1a14', '#322b22', '#4a4032', '#645744', '#807058', '#9c8a6e', '#b8a686', '#d2c2a2', '#e8dcc0', '#f8f2e0'];
  const R_GOWN = ['#040c0a', '#0a1a16', '#122822', '#1a3830', '#244a3e', '#2e5c4c', '#3a6e5a', '#488268', '#5a9878', '#74b08c', '#98c8a4'];
  const CB = ramp(['#04101e', '#0a2440', '#12406e', '#1e64a0', '#3290d0', '#5ab8f0', '#98dcff', '#d4f2ff', '#ffffff']);
  const G = ramp(['#1e0204', '#4a040c', '#7c0a14', '#b41420', '#e4262c', '#ff5440', '#ff9270', '#ffd0b8', '#fff6ee']);
  const BONE = defDeep(R_BONE, { depth: 5, amb: 0.16 }), BONED = defDeep(R_BONE, { depth: 4, dark: 3, amb: 0.1 }), SKULL = defDeep(R_BONE, { depth: 9, amb: 0.14 });
  const GOWN = defDeep(R_GOWN, { depth: 8, dark: 2, amb: 0.1 }), GOWND = defDeep(R_GOWN, { depth: 5, dark: 3, amb: 0.08 }), CAPM = defDeep(R_GOWN, { depth: 6, amb: 0.22 });
  const GLV = defDeep('stormcoat', { depth: 3, amb: 0.22 }), GLVD = defDeep('stormcoat', { depth: 3, dark: 3, amb: 0.12 });
  const STEEL = defDeep('bladesteel', { depth: 3, amb: 0.2 }), STEELD = defDeep('bladesteel', { depth: 3, dark: 3, amb: 0.1 }), MIRM = defDeep('bladesteel', { depth: 7, amb: 0.42 });
  const VOID = defDeep('obsidian', { depth: 3, dark: 4, amb: 0.02 }), RUB = defDeep('obsidian', { depth: 3, dark: 1, amb: 0.08 }), BLD = defDeep('hellhide', { depth: 3, dark: 3, amb: 0.08 });
  const EB1 = defMat([CB[1], CB[2], CB[3], CB[4]], 1, 1), EB2 = defMat([CB[3], CB[4], CB[5], CB[6]], 1, 1), EB3 = defMat([CB[5], CB[6], CB[7], CB[8]], 1, 1), EB4 = defMat([CB[7], CB[8], CB[8], CB[8]], 1, 1);
  const HT1 = defMat([G[1], G[2], G[3], G[4]], 1, 1), HT2 = defMat([G[3], G[4], G[5], G[6]], 1, 1), HT3 = defMat([G[5], G[6], G[7], G[8]], 1, 1);
  const TH = defMat(ramp([R_BONE[7], R_BONE[9], R_BONE[10], '#ffffff']), 1, 1);
  const hero = new Sprite(210, 128, 105, 112);
  const HX = 110, DUR = [2.4, 2 / 3, 0.75, 1.6, 0.5, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { operate: { 3: 1.2, 4: 0.5, 5: 0.7 }, cut: { 3: 1.4, 4: 0.5, 5: 0.7 }, stitch: { 3: 1.0, 4: 0.5, 5: 0.7 }, poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'operate', HOT = 0;   // HOT：第二阶段，手术衣撕开、红心常亮、刀刃和眼睛更亮
  const MIRL = [CB[8], CB[6], CB[4]], EYEL = [CB[7], CB[5], CB[3]], HEARTL = [G[6], G[4], G[3]], POOL = [DRAMP.hellhide[7], DRAMP.hellhide[5], DRAMP.hellhide[3]];
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: MIRL, k: 0.55 }, { x: 0, y: 0, r: 60, ramp: POOL, k: 0.42 }, { x: 0, y: 0, r: 0, ramp: EYEL, k: 0.7 }, { x: 0, y: 0, r: 0, ramp: HEARTL, k: 0.8 }, { x: 0, y: 0, r: 0, ramp: MIRL, k: 0.7 }];
  const RIM_R = [0, 14, 24, 36], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[FXI.frost], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(64) };
  for (const m of [EB1, EB2, EB3, EB4, HT1, HT2, HT3, TH]) RIM.skip[m] = 1;

  // 姿势：四只手（0 近上、1 近下、2 远上、3 远下）的手的位置 xi, yi 和刀的角度 ai（屏幕角度，0 朝右、正值往下转），
  //       身体升降 / 前倾、低头仰头（hd）、歪头（tilt）、下巴张开（jaw）
  const P = {};
  const KF = []; for (let i = 0; i < 4; i++) KF.push('x' + i, 'y' + i, 'a' + i); KF.push('lean', 'hd', 'tilt');
  const FIELDS = ['st', 'by', 'jaw', 'glow', 'eyes', 'mir', 'spot', 'thr', 'ndl', 'gown', 'heart', 'drop', 'scr', 'flash', 'dq', 'hot', 'drip', 'breath', 'sway', 'xcut', ...KF];
  const mk = (a, lean, hd, tilt) => { const o = { lean, hd, tilt: tilt || 0 }; a.forEach((v, i) => { o['x' + i] = v[0]; o['y' + i] = v[1]; o['a' + i] = v[2]; }); return o; };
  const K = {
    idle: mk([[40, -70, -0.95], [42, -38, 0.1], [-32, -72, -2.25], [-38, -36, 2.95]], 0.04, 0, 0),
    scrape: mk([[28, -70, 0.35], [26, -62, -0.55], [-32, -70, -2.2], [-38, -30, 2.95]], 0.02, 0.14, 0.12),        // 两把刀在脸前互相刮
    slashW: mk([[40, -70, -1.0], [18, -50, -1.2], [-32, -72, -2.25], [-38, -30, 2.95]], -0.06, 0, 0),            // 普攻：下手往回一收
    slash: mk([[40, -66, -0.8], [52, -32, 0.4], [-32, -70, -2.25], [-38, -28, 2.95]], 0.22, 0.12, 0),
    opW: mk([[48, -72, -2.45], [28, -62, -1.1], [-30, -80, -2.0], [-40, -44, 3.4]], -0.12, 0.18, 0.04),         // 开刀：近侧两把刀在脸前举高交叉成 X，远侧的手高高举起
    opC: mk([[50, -40, 1.15], [48, -22, 0.75], [38, -36, 1.0], [26, -20, 0.95]], 0.3, 0.22, 0),                // 四把刀一齐往前下劈
    cutW: mk([[-4, -66, -2.7], [-6, -40, 3.25], [-34, -58, -2.95], [-38, -34, 3.0]], -0.2, -0.06, -0.1),        // 横切：四只手拧到身后
    cutC: mk([[48, -62, -0.35], [44, -40, 0.1], [22, -54, -0.12], [16, -26, 0.32]], 0.24, 0.1, 0),             // 往前一扫，四把刀排成扇子
    stW: mk([[30, -72, -0.6], [36, -38, 0.2], [-30, -78, -2.4], [-38, -30, 2.9]], -0.12, -0.12, -0.06),        // 缝合：弯针在前、线往后拉直
    stC: mk([[54, -54, 0.15], [46, -36, 0.35], [-4, -68, -2.0], [-36, -30, 2.9]], 0.24, 0.1, 0),
    pokeW: mk([[8, -80, 1.0], [36, -36, 0.3], [-30, -68, -2.25], [-38, -30, 2.85]], -0.16, -0.08, 0.08),          // 重击：刀举过肩、刀尖朝前下
    stab: mk([[46, -8, 1.25], [42, -24, 0.6], [-26, -56, -2.3], [-34, -26, 2.8]], 0.36, 0.22, 0.04),
    climbA: mk([[40, -4, 1.35], [32, -24, 1.2], [-22, -32, 1.8], [-30, -8, 1.7]], 0.3, 0.25, 0.08),             // 拿四把刀当冰镐往上爬
    climbB: mk([[34, -30, 1.2], [36, -6, 1.35], [-22, -6, 1.75], [-30, -30, 1.8]], 0.32, 0.25, -0.06),
    wide: mk([[42, -80, -1.1], [50, -46, -0.2], [-34, -80, -2.1], [-46, -48, -3.0]], -0.18, -0.4, -0.1),       // 四臂全张、仰头嚎
    hug: mk([[8, -44, 2.6], [6, -30, 2.8], [4, -48, 0.5], [2, -32, 0.4]], 0.3, 0.36, 0.14),                    // 第二阶段：四只手抱住胸口
    agony: mk([[30, -82, -1.3], [44, -58, -0.6], [-20, -84, -1.9], [-40, -62, -2.5]], -0.2, -0.45, -0.15),
    limp: mk([[30, -2, 1.5], [22, 4, 1.6], [-18, -2, 1.6], [-28, 4, 1.6]], 0.5, 0.5, 0.5),
  };
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 1; P.hot = HOT; P.gown = HOT; P.heart = HOT; P.mx = 0; P.flip = 0; }

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.sway = (f12 >> 2) % 4;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.breath = b; P.by = -b; P.drip = f12 % 6; P.eyes = (f12 % 11 === 0) ? 2 : 1;
      for (let i = 0; i < 4; i++) P['y' + i] += [0, 1, 0, -1][(P.sway + i) & 3];                               // 四只手各自慢慢地动
      const lp = tt % DUR[IDLE];
      if (lp >= 0.3 && lp < 0.7) P.mir = lp < 0.4 ? 1 : lp < 0.55 ? 3 : 2;                                          // 额镜的反光扫过一道
      if (lp >= 0.9 && lp < 1.95) {                                                                               // 两把刀在脸前面互相刮
        const qi = lp < 1.7 ? ease.inOut(clamp01((lp - 0.9) / 0.25)) : 1 - ease.inOut(clamp01((lp - 1.7) / 0.25));
        pose(K.idle, K.scrape, qi); P.eyes = 2;
        if (lp >= 1.15 && lp < 1.7) { const s = Math.floor((lp - 1.15) * 12) & 1; P.x0 += s ? 3 : -2; P.x1 -= s ? 2 : -2; P.scr = 1; P.glow = 2; }
      }
      if (lp >= 2.0 && lp < 2.35) { P.tilt = lp < 2.12 ? 0.3 : 0.2; P.jaw = (Math.floor(lp * 12) & 1) ? 1 : 0; }        // 歪头、下巴咔哒
    };
    const climb = (tt) => { const f = Math.floor(tt * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.drip = f12 % 6; P.jaw = f & 1; };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { climb(tq); P.glow = 1; }
    else if (st === ATTACK) {
      if (tq < 0.17) pose(K.idle, K.slashW, ease.out(tq / 0.17));
      else if (tq < 0.25) { pose(K.slashW, K.slashW); P.glow = 2; P.eyes = 2; }
      else if (tq < 0.42) { pose(K.slash, K.slash); P.jaw = 1; P.glow = 3; P.eyes = 2; P.xcut = 1; }
      else pose(K.slash, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3)));
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12, climb);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { pose(K.idle, K.idle); P.hd = -0.3; P.tilt = -0.2; P.lean = -0.12; P.jaw = 2; P.eyes = 0; P.flash = h < 1 / 12 ? 1 : 0; for (let i = 0; i < 4; i++) { P['x' + i] -= 4; P['y' + i] -= 3; } }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.3 * (1 - q); P.tilt = -0.2 * (1 - q); P.lean = 0.04 - 0.16 * (1 - q); P.jaw = q < 0.5 ? 1 : 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.flash = d < 1 / 12 ? 1 : 0; for (let i = 0; i < 4; i++) P['a' + i] += ((f12 + i) & 1) ? 0.12 : -0.12; }
      else if (d < 1.5) { pose(K.agony, K.limp, ease.in(clamp01((d - 0.7) / 0.6))); P.drop = 1; P.jaw = d < 1.0 ? 3 : 2; P.glow = 0; P.eyes = d < 1.2 ? 2 : 1; }
      else { pose(K.limp, K.limp); P.drop = 1; P.jaw = 3; P.glow = 0; P.eyes = 0; P.mir = d < 2.3 ? 0 : 3; P.by = Math.round(ease.in(clamp01((d - 1.5) / 1.1)) * 46);
        P.dq = d > 2.2 ? Math.round(clamp01((d - 2.2) / 0.4) * 48) / 48 : 0; }
    }
    if (P.hot && st !== DEATH) { if (P.glow < 2) P.glow = 2; if (P.eyes === 1) P.eyes = 2; P.heart = 1 + ((f12 % 8) < 2 ? 1 : 0); }
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = L.head[0]; P.gy = L.head[1];
  }
  const MVI = { operate: 0, cut: 1, stitch: 2, poke: 3, rise: 4, p2: 5 };
  function movePose(st, tq, f12, climb) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D), tr = (f12 & 1) ? 1 : -1;
    const shiver = (k) => { for (let i = 0; i < 4; i++) P['x' + i] += tr * k; P.by += (f12 & 1); };
    if (MV === 'operate') {
      if (st === CHARGE) { pose(K.idle, K.opW, ease.out(clamp01(q / 0.35))); P.mir = q < 0.3 ? 1 : q < 0.65 ? 2 : 3; P.spot = q >= 0.4 ? 1 : 0; P.glow = q < 0.4 ? 2 : 3; P.eyes = q > 0.5 ? 2 : 1;
        if (q > 0.8) { shiver(1); P.jaw = 1; } }
      else if (st === CAST) { pose(K.opC, K.opC); P.jaw = 2; P.glow = 3; P.eyes = 2; P.mir = 3; P.by = 2; P.xcut = 1; }
      else pose(K.opC, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else if (MV === 'cut') {
      if (st === CHARGE) { pose(K.idle, K.cutW, ease.out(clamp01(q / 0.4))); P.glow = q < 0.45 ? 2 : 3; P.eyes = q > 0.4 ? 2 : 1; P.lean -= 0.06 * clamp01((q - 0.4) / 0.5);
        if (q > 0.8) { shiver(1); P.jaw = 1; } }
      else if (st === CAST) { pose(K.cutC, K.cutC); P.jaw = 2; P.glow = 3; P.eyes = 2; P.xcut = 1; }
      else pose(K.cutC, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else if (MV === 'stitch') {
      if (st === CHARGE) { pose(K.idle, K.stW, ease.out(clamp01(q / 0.35))); P.ndl = 1; P.thr = q < 0.25 ? 1 : q < 0.6 ? 2 : 3; P.glow = 2; P.eyes = q > 0.5 ? 2 : 1;
        P.x2 -= Math.round(4 * clamp01((q - 0.3) / 0.5)); if (q > 0.8) { shiver(1); P.jaw = 1; } }
      else if (st === CAST) { pose(K.stC, K.stC); P.ndl = 1; P.thr = 4; P.jaw = 2; P.glow = 3; P.eyes = 2; }
      else { pose(K.stC, K.idle, ease.inOut(clamp01(tq / 0.6))); P.ndl = tq < 0.35 ? 1 : 0; P.thr = tq < 0.35 ? 1 : 0; }
    } else if (MV === 'poke') {
      if (st === CHARGE) { pose(K.idle, K.pokeW, ease.out(clamp01(q / 0.45))); P.by = 0; if (q > 0.6) shiver(1); P.glow = q < 0.5 ? 2 : 3; P.eyes = 2; P.jaw = q > 0.8 ? 1 : 0; }
      else if (st === CAST) { pose(K.stab, K.stab); P.by = 3; P.jaw = 2; P.glow = 3; P.eyes = 2; }
      else { pose(K.stab, K.idle, ease.inOut(clamp01(tq / 0.5))); P.by = Math.round(3 * (1 - clamp01(tq / 0.5))); }
    } else if (MV === 'rise') {
      if (st === CHARGE) { climb(tq); P.by += Math.round(22 * (1 - ease.inOut(q)) / 2) * 2; P.glow = 1 + (f12 & 1); P.eyes = q > 0.6 ? 2 : (q > 0.3 ? 1 : 0); P.mir = q > 0.85 ? 3 : 0; }
      else if (st === CAST) { pose(K.climbB, K.wide, ease.out(clamp01(tq / 0.15))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.mir = 3; if (tq < 0.1) P.tilt = 0.3; }
      else pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else {   // p2：四只手抱住胸口 → 两声心电「嘀」、身子抽两下 → 撕开手术衣、四臂全张
      if (st === CHARGE) { pose(K.idle, K.hug, ease.out(clamp01(tq / 0.25))); P.gown = 0; const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47);
        P.glow = hb ? 3 : 1; P.eyes = hb ? 2 : 1; P.hot = 0; P.heart = 0; P.by = hb ? 1 : 0; P.mir = hb ? 2 : 0; if (hb) P.tilt += tq < 0.12 ? 0.2 : -0.2; }
      else if (st === CAST) { pose(K.hug, K.wide, ease.out(clamp01(tq / 0.12))); P.gown = 1; P.heart = 2; P.jaw = 3; P.glow = 3; P.eyes = 2; P.hot = 1; P.mir = 3; }
      else { const hold = tq < 1.0; pose(K.wide, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.gown = 1; P.jaw = hold ? 3 - ((f12 >> 1) & 1) : 0; P.glow = 3; P.eyes = 2; P.hot = 1; }
    }
  }

  // ───── 几何 ─────
  const L = {};
  const SH = [[17, -46], [15, -36], [-13, -46], [-14, -36]], LEN = [[18, 19], [15, 16], [18, 19], [15, 16]], BEND = [1, 1, -1, -1], NECK = [3, -52];
  const lerp = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q], add = (a, d, k) => [a[0] + d[0] * k, a[1] + d[1] * k];
  function torsoXf() { B.reset(); B.move(0, P.by); B.rot(0, 0, P.lean); }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd * 0.5 - P.lean * 0.5 + P.tilt); }
  // 头整体放大 1.2 倍（绕脖子）：骷髅头、手术帽和额镜要占剪影的大头
  const HS = 1.2, hsx = (x) => NECK[0] + (x - NECK[0]) * HS, hsy = (y) => NECK[1] + (y - NECK[1]) * HS;
  const H = { ell: (e, cx, cy, rx, ry, a, m, t) => B.ell(e, hsx(cx), hsy(cy), rx * HS, ry * HS, a, m, t), poly: (e, pts, m, t) => B.poly(e, pts.map((p) => [hsx(p[0]), hsy(p[1])]), m, t),
    ln: (e, x0, y0, x1, y1, m, t) => B.ln(e, hsx(x0), hsy(y0), hsx(x1), hsy(y1), m, t), px: (e, x, y, m, t) => B.px(e, hsx(x), hsy(y), m, t), at: (x, y) => B.at(hsx(x), hsy(y)),
    save: () => B.save(), restore: () => B.restore(), rot: (x, y, a) => B.rot(hsx(x), hsy(y), a) };
  const reach = (s, h, l) => { const dx = h[0] - s[0], dy = h[1] - s[1], d = Math.hypot(dx, dy), m = l - 0.8; return d > m ? [s[0] + dx / d * m, s[1] + dy / d * m] : h; };
  function geo() {
    torsoXf(); L.sh = SH.map((p) => B.at(p[0], p[1])); L.chest = B.at(2, -32); L.heart = B.at(3, -34); 
    headXf(); L.eyeN = H.at(13, -68); L.eyeF = H.at(3.5, -68); L.eye = H.at(8, -68); L.mouth = H.at(10, -57); L.mir = H.at(10.5, -81.5); L.head = H.at(6, -74);
    B.reset(); L.h = []; L.el = []; L.d = []; L.tip = [];
    for (let i = 0; i < 4; i++) {
      const h = reach(L.sh[i], [P['x' + i], P['y' + i] + P.by], LEN[i][0] + LEN[i][1]), a = P['a' + i], d = [Math.cos(a), Math.sin(a)];
      L.h[i] = h; L.el[i] = B.ik(L.sh[i], h, LEN[i][0], LEN[i][1], BEND[i]); L.d[i] = d; L.tip[i] = add(h, d, 19);
    }
    L.x = lerp(L.tip[0], L.tip[2], 0.5);
  }
  const capW = (a, b, r0, r1, m, t) => B.capW(E, a[0], a[1], b[0], b[1], r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (p, r, m, t) => B.dotW(E, p[0], p[1], r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (a, b, m, t) => B.lnW(E, a[0], a[1], b[0], b[1], m, t);

  function arm(i) {   // 上面一对：袖子卷到肘上，露出骨头小臂；下面一对：从衣服破洞里伸出来的光骨头
    const far = i >= 2, low = i === 1 || i === 3, sh = L.sh[i], el = L.el[i], h = L.h[i], bn = far ? BONED : BONE, gw = far ? GOWND : GOWN;
    if (low) { part(); capW(sh, el, 1.9, 1.5, bn); const m = lerp(sh, el, 0.5); lnW(lerp(sh, el, 0.2), m, bn, 8); dot(sh, 2.4, bn); }   // 上臂骨、肩关节
    else { part(); capW(sh, el, 4.4, 3.6, gw); const c0 = lerp(sh, el, 0.72); capW(c0, el, 4.2, 4.0, gw, 7); lnW(lerp(sh, el, 0.3), lerp(sh, el, 0.62), gw, 3); }   // 袖子和卷起来的袖口
    part(); const d = [h[0] - el[0], h[1] - el[1]], dl = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / dl, d[0] / dl];
    capW(add(el, n, 1.0), add(h, n, 0.8), 1.2, 1.0, bn); capW(add(el, n, -1.0), add(h, n, -0.7), 1.1, 0.9, bn); lnW(lerp(el, h, 0.2), lerp(el, h, 0.8), bn, 3);   // 尺骨和桡骨，中间一道缝
    dot(el, low ? 2.2 : 1.8, bn); px(el[0] - 0.5, el[1] - 0.8, bn, 8);                                                   // 肘关节
  }
  function scalpel(i) {   // 手术刀：带防滑纹的钢柄、刀片一边直一边弧，刃口冷蓝
    if (P.drop || (i === 0 && P.ndl)) return;
    const far = i >= 2, h = L.h[i], d = L.d[i], n = [-d[1], d[0]], st = far ? STEELD : STEEL;
    const hb = add(h, d, -8), hf = add(h, d, 3.5), bb = add(h, d, 4), tip = L.tip[i];
    part(); capW(hb, hf, 1.3, 1.1, st); for (let k = -7; k <= -3; k += 1.5) px(...add(h, d, k), st, 3); px(...hb, st, 8); lnW(add(hb, n, 0.6), add(hf, n, 0.6), st, 8);
    const b = (k, w) => add(add(bb, d, k), n, w);
    part(); polyW([b(0, -1.0), b(4, 1.8), b(9, 2.5), b(13, 1.6), tip, b(12, -1.0)], st);
    lnW(b(0.5, -0.6), b(12, -0.6), st, 3); lnW(b(2, 0.4), b(10, 0.9), st, 7);
    const em = P.glow >= 3 ? EB3 : P.glow >= 2 ? EB2 : 0;
    if (em) { lnW(b(4, 1.8), b(9, 2.5), em); lnW(b(9, 2.5), b(13, 1.6), em); lnW(b(13, 1.6), tip, em); }
    else { lnW(b(4, 1.8), b(9, 2.5), st, 8); lnW(b(9, 2.5), b(13, 1.6), st, 8); }
    if (P.glow >= 2) px(tip[0], tip[1], P.glow >= 3 ? EB4 : EB3); else px(tip[0], tip[1], st, 8);
  }
  function needle() {   // 缝合：一根大弯针（半圆），针尾拴着发光的缝线
    if (!P.ndl) return; const h = L.h[0], d = L.d[0], n = [-d[1], d[0]], c = add(h, d, 6);
    part(); let prev = null; for (let k = 0; k <= 8; k++) { const a = Math.PI * (k / 8), p = add(add(c, d, -Math.cos(a) * 6), n, -Math.sin(a) * 6); if (prev) capW(prev, p, k < 7 ? 0.9 : 0.6, k < 7 ? 0.9 : 0.4, STEEL, k > 5 ? 8 : 0); prev = p; }
    L.ndlEye = add(c, d, -6); L.ndlTip = prev; px(prev[0], prev[1], P.glow >= 3 ? EB4 : EB3);
  }
  function thread() {   // 缝线：从弯针的针尾拉到远侧上手，蓄力时越绷越直、越来越亮
    if (!P.thr || !P.ndl) return; const a = L.h[0], b = L.h[2], sag = P.thr >= 3 ? 1 : 10 - P.thr * 3, m = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + sag + (P.sway & 1)];
    const pts = B.bez(a, m, b, 18); part(); for (let i = 1; i < pts.length; i++) lnW(pts[i - 1], pts[i], P.thr >= 3 ? TH : BONE, P.thr >= 3 ? 0 : 9);
    if (P.thr >= 2) for (let i = 2; i < pts.length; i += 4) px(pts[i][0], pts[i][1], P.thr >= 3 ? EB4 : TH);
    if (P.thr >= 4) { const e = L.h[0]; for (let k = 1; k < 7; k++) px(e[0] + k * 3, e[1] + ((k & 1) ? -1 : 1), k < 4 ? TH : EB3); }   // 甩出去的那截
  }
  function hand(i) {   // 橡胶手套：四根指头握着刀柄，手套口卷一道边
    const far = i >= 2, h = L.h[i], el = L.el[i], g = far ? GLVD : GLV, d = L.d[i], n = [-d[1], d[0]];
    part(); const w = lerp(el, h, 0.78); capW(w, h, 2.1, 2.3, g); lnW(add(w, [w[1] - h[1], h[0] - w[0]], 0.5), add(w, [h[1] - w[1], w[0] - h[0]], 0.5), g, 8);   // 手套口
    dot(h, 2.7, g);
    if (P.drop) { for (let k = 0; k < 4; k++) { const a = Math.atan2(h[1] - el[1], h[0] - el[0]) + (k - 1.5) * 0.4, tp = [h[0] + Math.cos(a) * 6, h[1] + Math.sin(a) * 6]; capW(h, tp, 1, 0.6, g, k ? 0 : 7); } return; }
    for (let k = 0; k < 4; k++) { const b = add(h, d, k * 1.6 - 2.2); capW(add(b, n, 2.2), add(b, n, -2.4), 0.9, 0.8, g, k === 0 ? 8 : 0); px(...add(b, n, -2.6), g, 3); }
    capW(add(h, n, 2.2), add(add(h, n, 1), d, 3), 0.8, 0.7, g, 7);                                                            // 拇指压在刀柄上
  }
  function holes() {   // 下面两只手是从手术衣两边的破洞里伸出来的
    torsoXf(); for (const [x, y] of [[15, -36], [-14, -36]]) { B.ell(E, x, y, 3.8, 4.6, 0.2, VOID); B.ln(E, x - 3, y - 4, x - 1, y - 2, GOWN, 8); B.ln(E, x + 2, y + 3, x + 4, y + 5, GOWN, 8); }
  }
  function capBack() {   // 手术帽后脑的结和两根垂下来的带子
    part(); headXf(); const k = H.at(-9, -76); B.reset(); const sw = [0, 1, 1, 0][P.sway];
    B.strand(E, [k, [k[0] - 3, k[1] + 4], [k[0] - 4 + sw, k[1] + 10], [k[0] - 3 + sw, k[1] + 15]], 1.6, 1, CAPM); B.strand(E, [k, [k[0] - 1, k[1] + 5], [k[0] - 1 + sw, k[1] + 11]], 1.4, 0.9, CAPM, 3);
  }
  function neck() { part(); torsoXf(); B.cap(E, 2, -46, 4, -58, 2.6, 2.4, BONED); for (const y of [-49, -52, -55]) B.ln(E, 1, y, 5, y - 0.4, BONED, 2); }   // 一节节的颈椎
  function torso() {
    part(); torsoXf();
    B.poly(E, [[-14, 6], [14, 6], [13, -10], [16, -24], [19, -38], [21, -45], [15, -51], [4, -53], [-7, -53], [-17, -50], [-20, -44], [-17, -32], [-14, -18], [-13, -6]], GOWN);
    B.ln(E, -15, -40, -12, -18, GOWN, 3); B.ln(E, 17, -38, 14, -16, GOWN, 3); B.ln(E, 6, -22, 9, 4, GOWN, 3); B.ln(E, -4, -20, -6, 4, GOWN, 3); B.ln(E, 1, -18, 1, 4, GOWN, 7);   // 衣褶
    B.ln(E, -17, -49, 14, -51, GOWN, 8); B.ln(E, 19, -44, 17, -30, GOWN, 7);
    // 血：胸口一大片溅射、往下淌，下摆一片；第二阶段更多
    B.ell(E, 9, -26, 3.2, 2.2, 0.4, BLD); B.px(E, 13, -29, BLD); B.px(E, 6, -30, BLD); B.px(E, 12, -23, BLD); B.ln(E, 9, -24, 9, -16, BLD); B.ln(E, 7, -25, 7, -19, BLD); B.px(E, 9, -15, BLD);
    B.ell(E, -6, -4, 4.5, 3, 0.3, BLD); B.px(E, -11, -7, BLD); B.px(E, -2, -8, BLD); B.ln(E, -5, -2, -5, 5, BLD); B.ln(E, 4, -8, 5, 5, BLD); B.px(E, -12, -36, BLD); B.px(E, 16, -41, BLD);
    if (P.hot) { B.ell(E, 12, -8, 3, 4, 0.2, BLD); B.ln(E, 12, -5, 13, 4, BLD); B.ell(E, -10, -24, 2.5, 2, 0, BLD); B.ln(E, -10, -22, -11, -12, BLD); }
    holes();
    if (P.gown) {   // 手术衣撕开：黑洞洞的胸腔、肋骨、胸骨，里面一颗缝过的红心在跳；破口两边一排粗缝线
      part(); torsoXf(); B.poly(E, [[-8, -50], [12, -50], [14, -38], [13, -22], [4, -12], [-5, -22], [-9, -38]], VOID);
      const hr = P.heart >= 2 ? 1 : 0, hm = P.heart >= 2 ? HT2 : HT1;
      B.ell(E, 3, -33, 5.6 + hr, 5 + hr, 0.3, hm); B.ell(E, 1, -35, 2.2, 1.8, 0, P.heart >= 2 ? HT3 : HT2); B.px(E, 0, -36, HT3); B.ln(E, 5, -38, 6, -43, hm); B.ln(E, 1, -38, 0, -44, hm); B.ln(E, 3, -38, 3, -43, HT1);
      for (let y = -37; y <= -29; y += 2) B.ln(E, 0, y, 6, y + 1.5, VOID);                                                                           // 心上缝的黑线
      part(); torsoXf(); B.ln(E, 2, -47, 2, -24, BONE); B.ln(E, 3, -47, 3, -26, BONE, 8);
      for (const [y, w] of [[-44, 7], [-39, 8], [-34, 8], [-29, 7]]) { B.ln(E, 2, y, 2 + w, y + 2, BONE); B.ln(E, 2 + w, y + 2, 2 + w + 1, y + 4, BONE, 3); B.ln(E, 2, y, 2 - w + 1, y + 2, BONED); }
      for (let y = -48; y <= -20; y += 4) { B.ln(E, -10, y, -6, y + 1, TH); B.ln(E, 15 - (y > -26 ? 2 : 0), y, 11 - (y > -26 ? 2 : 0), y + 1, TH); }   // 破口两边的缝线
    }
    part(); torsoXf();   // V 领：锁骨和胸骨头，领口一道边
    B.poly(E, [[-6, -53], [9, -53], [2, -43]], BONED); B.ln(E, -5, -51, 1, -48, BONE, 8); B.ln(E, 8, -51, 3, -48, BONE, 8); B.ln(E, 2, -48, 2, -44, BONE, 7);
    B.ln(E, -7, -53, 2, -42, GOWN, 8); B.ln(E, 10, -53, 2, -42, GOWN, 8);
    part(); torsoXf();   // 听诊器：黑胶管搭在脖子上、两头垂在胸前，一头是钢的听头
    B.strand(E, [[-5, -53], [-8, -48], [-9, -40], [-7, -34]], 1.1, 1.0, RUB); B.strand(E, [[10, -53], [13, -47], [14, -40], [13, -35]], 1.1, 1.0, RUB);
    B.ln(E, 13, -35, 13, -31, STEEL); B.ln(E, 12, -35, 11, -32, STEEL);
    part(); torsoXf(); B.ell(E, -7, -32, 2.6, 2.6, 0, STEEL); B.ell(E, -7, -32, 1.2, 1.2, 0, STEEL, 8); B.px(E, -8, -33, STEEL, 10);
  }
  function head() {   // 骷髅头（向右的 3/4 侧）：大颅骨、颧骨、两个黑眼眶里冷蓝的光、鼻洞、上排牙；下巴单独一块，张嘴往下转
    part(); headXf(); const J = P.jaw;
    H.poly(E, [[0, -63], [16, -61], [14, -57], [4, -57]], VOID);                                                   // 嘴里的黑
    H.save(); H.rot(0, -64, J * 0.13);
    H.poly(E, [[-1, -65], [1, -60], [4, -56], [10, -54.5], [16, -55], [18, -57.5], [16, -59], [5, -59], [2, -62]], SKULL);
    H.ln(E, 4, -55.5, 16, -56, SKULL, 3); H.ln(E, 2, -60, 5, -56, SKULL, 8);
    for (let x = 6; x <= 16; x += 2) { H.ln(E, x, -59, x, -57.8, SKULL, 9); H.px(E, x + 1, -58.4, SKULL, 2); }       // 下排牙
    H.restore();
    part(); headXf();
    H.ell(E, 5, -73, 12.5, 11.5, 0, SKULL); H.poly(E, [[-4, -70], [17, -73], [19.5, -67], [18.5, -62], [14.5, -59.5], [4, -59.5], [-1, -63]], SKULL);
    H.ln(E, -3, -68, -1, -62, SKULL, 2); H.ln(E, 8, -63.5, 15, -63.5, SKULL, 3); H.ln(E, 8, -64.5, 14, -65, SKULL, 8);          // 太阳穴的凹、颧骨
    H.ln(E, -2, -79, 2, -74, SKULL, 2); H.ln(E, 2, -74, 1, -71, SKULL, 2); H.ln(E, 2, -74, 5, -73, SKULL, 2);                   // 颅骨上的裂
    H.ln(E, 0, -72.5, 18, -73, SKULL, 8);                                                                             // 眉骨
    for (const [x, rx] of [[3.5, 2.8], [13, 3.7]]) { H.ell(E, x, -68, rx, 3.4, 0, VOID); H.ln(E, x - rx + 1, -64.6, x + rx - 1, -64.6, SKULL, 3); }
    H.poly(E, [[17, -66], [18.6, -62.6], [15.8, -62.6]], VOID);                                                        // 鼻洞
    for (let x = 5; x <= 16; x += 1.8) { H.ln(E, x, -61.2, x, -59.6, SKULL, 9); H.px(E, x + 0.9, -60.2, SKULL, 2); }     // 上排牙
    if (P.eyes) { const c = P.eyes >= 2 ? EB3 : EB2;
      for (const x of [3.5, 13]) { H.px(E, x, -68, c); H.px(E, x + 1, -68, c); if (P.eyes >= 2) { H.px(E, x, -69, EB2); H.px(E, x + 1, -67, EB2); H.px(E, x - 1, -68, EB1); H.px(E, x + 2, -68, EB1); H.px(E, x + 0.5, -68, EB4); } } }
  }
  function cap() {   // 绿色手术帽：鼓鼓的包住颅顶，一道道褶；前额一根黑头带
    part(); headXf(); H.poly(E, [[-9, -72], [-11, -78], [-8, -84], [-1, -88], [8, -89], [15, -87], [19, -82], [19.5, -77], [-6, -75.5]], CAPM);
    H.ln(E, -6, -85, 8, -88, CAPM, 8); H.ln(E, -3, -80, 0, -86, CAPM, 3); H.ln(E, 5, -79, 7, -87, CAPM, 3); H.ln(E, 12, -78, 15, -85, CAPM, 3); H.ln(E, -9, -77, -10, -82, CAPM, 3);
    H.px(E, 1, -84, BLD); H.px(E, 2, -83, BLD); H.px(E, 16, -80, BLD);
    part(); headXf(); H.poly(E, [[-9.5, -77.5], [19.5, -79], [19.5, -76.5], [-8.5, -75]], RUB); H.ln(E, -8, -77, 19, -78.5, RUB, 8);
  }
  function mirror() {   // 额镜：头带上顶着一面比眼眶还大的圆镜，中间一个小孔，反着手术灯的冷光
    part(); headXf(); H.ell(E, 10.5, -81.5, 6.8, 7.4, 0.25, STEELD); H.ln(E, 9, -76, 10, -78, STEELD, 8);
    part(); headXf(); H.ell(E, 10.8, -81.6, 5.5, 6.1, 0.25, MIRM); H.ell(E, 11.4, -81, 1.1, 1.2, 0, VOID);
    const m = P.mir, g1 = m >= 2 ? EB4 : EB3;
    H.ln(E, 7.5, -84.5, 9.5, -86, m ? g1 : MIRM, m ? 0 : 9); H.px(E, 7, -83, m ? EB3 : MIRM, 8); H.ln(E, 13, -77.5, 15, -79, MIRM, 3);
    if (m >= 2) { H.ln(E, 8.5, -83, 11, -85.5, EB3); H.px(E, 8, -85, EB4); }
    if (m >= 3) { const c = H.at(8.3, -84.8); B.reset(); for (let k = 1; k <= 4; k++) { px(c[0] + k, c[1], k < 3 ? EB4 : EB3); px(c[0] - k, c[1], k < 3 ? EB4 : EB3); px(c[0], c[1] - k, k < 3 ? EB4 : EB3); px(c[0], c[1] + k, k < 3 ? EB4 : EB2); } }   // 十字闪光
  }
  function drips() {   // 刀尖往下滴血
    if (P.drop || P.dq) return; const k = P.drip; if (!k) return; part();
    for (const i of [0, 1]) { const p = L.tip[i], dd = (k + i * 3) % 6; if (p[1] + dd > 0 || L.d[i][1] < -0.3) continue; px(p[0], p[1] + 1 + dd, dd < 2 ? HT2 : HT1); if (dd > 0) px(p[0], p[1] + dd, HT1); }
  }

  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    for (const i of [3, 2]) { arm(i); scalpel(i); hand(i); }
    thread(); capBack(); torso(); neck(); head(); cap(); mirror();
    for (const i of [1, 0]) { arm(i); scalpel(i); needle(); hand(i); }
    drips(); B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1; const m = L.mir, e = L.eye;
    RIM.rim = P.glow >= 3 ? 2 : P.glow >= 2 ? 1 : 0; RIM.rx = m[0] * z + spr.ox; RIM.ry = m[1] * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = m[0] * z + spr.ox; LIGHTS[0].y = m[1] * z + spr.oy; LIGHTS[0].r = (P.mir >= 3 ? 13 : P.mir >= 2 ? 10 : P.mir ? 7 : 4) * z;
    LIGHTS[1].x = spr.ox; LIGHTS[1].y = spr.oy + 16 * z; LIGHTS[1].r = 58 * z; LIGHTS[1].k = P.hot ? 0.52 : 0.42;          // 血池从下面映上来
    LIGHTS[2].x = e[0] * z + spr.ox; LIGHTS[2].y = e[1] * z + spr.oy; LIGHTS[2].r = (P.eyes >= 2 ? 8 : P.eyes ? 4 : 0) * z;
    LIGHTS[3].x = L.heart[0] * z + spr.ox; LIGHTS[3].y = L.heart[1] * z + spr.oy; LIGHTS[3].r = (P.gown ? (P.heart >= 2 ? 18 : 12) : 0) * z;
    const o = P.thr ? lerp(L.h[0], L.h[2], 0.5) : L.x; LIGHTS[4].x = o[0] * z + spr.ox; LIGHTS[4].y = o[1] * z + spr.oy;
    LIGHTS[4].r = ((P.thr >= 3 ? 16 : P.thr ? 10 : 0) + (P.st === CHARGE && MV === 'operate' ? 8 + P.mir * 3 : 0)) * z;
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  function portrait() {   // 立绘：正面四臂张开、四把刀冷光、额镜十字闪光、下巴微张
    const hot = HOT; HOT = 0; poseAt(IDLE, 0, 0); pose(K.idle, K.wide, 0.45); P.hd = -0.02; P.tilt = 0.04; P.lean = 0.02; P.eyes = 2; P.glow = 3; P.mir = 3; P.jaw = 1; P.by = 0; P.breath = 0; P.drip = 0; P.sway = 1;
    P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; headXf(); const c = H.at(7, -74); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 33 * 2]; return PSPR;
  }
  let PHEAD = null;   // 立绘里头的位置（缓冲坐标）和半径：地图节点的头像从这里裁（连手术帽和额镜）

  // ───── 特效（舞台坐标；游戏里只画身边的，砍到部队身上的由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let emT = 0, dpT = 0;
  const sparks = (p, n) => { for (let k = 0; k < n; k++) spawnX(K_PHYS, sx(p[0]), sy(p[1]), (Math.random() - 0.3) * 120, -40 - Math.random() * 90, 0.3 + Math.random() * 0.3, FXI.frost, { g: 300 }); };
  const bloodUp = (x, y, n, v) => { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 10, y, (Math.random() - 0.5) * v, -60 - Math.random() * v, 0.8 + Math.random() * 0.5, FXI.blood, { g: 340, floor: HY + 2 }); };
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'operate') { const c = L.sh[0];
        for (let i = 0; i < 4; i++) fx.slash(sx(c[0] - 6 + i * 2), sy(c[1] - 4 + i * 5), 30 - i * 3, -0.2 + i * 0.1, 2.3, i & 1 ? 'frost' : 'steel', 0.26, 3 - (i >> 1), 2);
        for (const i of [0, 2]) { const t = L.tip[i]; burst(sx(t[0]), sy(t[1]), 14, 40, 140, 0.25, 0.5, FXI.blood, 20); fx.cross(sx(t[0]), sy(t[1]), 7, 'frost', 0.22, 1); }
        ring(sx(L.tip[0][0]), sy(L.tip[0][1]), 0, FXI.frost); shake(0.35, 3); flash(0.1); sfx('boss', { k: 'surgeonSlice', w: 1 }); sfx('swing', { w: 1 }); sfx('hit', { mat: 'flesh', w: 1 }); }
      else if (MV === 'cut') { const c = [6, -38];
        for (let i = 0; i < 4; i++) { fx.slash(sx(c[0]), sy(c[1] - 14 + i * 12), 46 - Math.abs(i - 1.5) * 4, 0.5, 2.5, i & 1 ? 'frost' : 'steel', 0.3, 3, 2); }
        for (let i = 0; i < 4; i++) { const t = L.tip[i]; fx.beam(sx(t[0] - 20), sy(t[1]), sx(t[0] + 16), sy(t[1] + 1), 1, 'frost', 0.18, 1); burst(sx(t[0]), sy(t[1]), 8, 40, 130, 0.2, 0.45, FXI.blood, 10); }
        shake(0.35, 3); flash(0.08); sfx('boss', { k: 'surgeonCut', w: 1 }); sfx('swing', { w: 1 }); }
      else if (MV === 'stitch') { const e = L.ndlEye || L.h[0];
        fx.beam(sx(e[0]), sy(e[1]), sx(e[0] + 70), sy(e[1] + 6), 1, 'holy', 0.3, 1); fx.beam(sx(e[0]), sy(e[1]), sx(e[0] + 60), sy(e[1] - 4), 1, 'frost', 0.25, 1);
        ring(sx(e[0]), sy(e[1]), 0, FXI.holy); burst(sx(e[0]), sy(e[1]), 12, 40, 120, 0.25, 0.5, FXI.frost, 10); shake(0.3, 3); flash(0.06); sfx('boss', { k: 'surgeonThread', w: 1 }); sfx('swing', { w: 0.8 }); }
      else if (MV === 'poke') { const x = sx(Math.min(L.tip[0][0], 78)), y = HY; fx.wave(x, y, 1, 36, 8, 'blood', 0.5, 2); fx.wave(x, y, -1, 28, 6, 'blood', 0.45, 2); fx.crack(x, y + 1, 18, 1, 'blood', 1.0);
        burst(x, y - 2, 22, 60, 170, 0.3, 0.7, FXI.blood, 50); bloodUp(x, y - 3, 18, 170); fx.cross(x, y - 6, 8, 'frost', 0.2, 1);
        ring(x, HY - 2, 1, FXI.blood); shake(0.35, 3); flash(0.06); sfx('boss', { k: 'surgeonStab', w: 1 }); sfx('boss', { k: 'slam', w: 0.6 }); sfx('hit', { mat: 'flesh', w: 1 }); }
      else if (MV === 'rise' || MV === 'p2') { const m = L.mouth; ring(sx(m[0]), sy(m[1]), 1, FXI.frost); ring(sx(2), sy(-34), 1, FXI.blood); flash(0.12); shake(0.4, 3);
        for (let i = 0; i < 4; i++) { const t = L.tip[i]; fx.cross(sx(t[0]), sy(t[1]), 6, 'frost', 0.3, 1); }
        if (MV === 'p2') { const h = L.heart; burst(sx(h[0]), sy(h[1]), 30, 50, 160, 0.3, 0.7, FXI.blood, 30); for (let i = 0; i < 14; i++) spawnX(K_PHYS, sx(h[0]), sy(h[1]), (Math.random() - 0.3) * 160, -40 - Math.random() * 120, 0.8, FXI.blood, { g: 260, floor: HY + 4 }); sfx('boss', { k: 'surgeonTear', w: 1 }); }
        else bloodUp(sx(0), HY - 2, 24, 160);
        sfx('boss', { k: 'surgeonRoar', w: 1 }); sfx('impact', { pal: 'blood', w: 1 }); }
    }
    if (s === CHARGE && MV === 'operate') sfx('boss', { k: 'surgeonLamp', w: 1, dur: E.DUR[CHARGE] });
    if (s === CHARGE && MV === 'cut') sfx('boss', { k: 'surgeonScrape', w: 1 });
    if (s === CHARGE && MV === 'stitch') sfx('boss', { k: 'surgeonPull', w: 1 });
    if (s === CHARGE && MV === 'poke') sfx('boss', { k: 'surgeonGlint', w: 0.8 });
    if (s === CHARGE && MV === 'rise') sfx('boss', { k: 'surgeonRattle', w: 1 });
    if (s === CHARGE && MV === 'p2') sfx('boss', { k: 'surgeonBeep', w: 1 });
  }
  function onTime(s, t) {
    if (s === IDLE && t === 0.4) sfx('boss', { k: 'surgeonGlint', w: 0.5 });
    if (s === IDLE && (t === 1.25 || t === 1.5)) { sparks(lerp(L.h[0], L.h[1], 0.5), 5); sfx('boss', { k: 'surgeonScrape', w: 0.5 }); }
    if (s === IDLE && t === 2.05) sfx('boss', { k: 'surgeonClack', w: 0.6 });
    if (s === MOVE) { const p = L.tip[t < 0.3 ? 0 : 1]; bloodUp(sx(p[0]), HY - 1, 6, 60); sfx('boss', { k: 'surgeonRattle', w: 0.35 }); }
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'surgeonGlint', w: 0.4 });
    if (s === ATTACK && t === 3 / 12) { const p = L.tip[1], c = L.sh[1]; fx.slash(sx(c[0]), sy(c[1]), 30, 0.6, 2.2, 'frost', 0.2, 2, 2); burst(sx(p[0]), sy(p[1]), 14, 50, 130, 0.25, 0.5, FXI.blood, 20); hitDummy(1, 1); shake(0.15, 2); sfx('swing', { w: 1 }); sfx('hit', { mat: 'flesh', w: 1 }); }
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'surgeonDie', w: 1 });
    if (s === DEATH && t === INCOMING + 0.7) { for (let i = 0; i < 4; i++) { const p = L.h[i]; for (let k = 0; k < 4; k++) spawnX(K_PHYS, sx(p[0] + L.d[i][0] * k * 3), sy(p[1] + L.d[i][1] * k * 3), (Math.random() - 0.5) * 50, -30 - Math.random() * 40, 1.0, FXI.steel, { g: 320, floor: HY + 2 }); }
      burst(sx(L.mir[0]), sy(L.mir[1]), 16, 30, 110, 0.3, 0.6, FXI.frost, 20); flash(0.08); shake(0.25, 2); sfx('boss', { k: 'surgeonFlat', w: 1 }); sfx('boss', { k: 'surgeonRattle', w: 0.8 }); }
    if (s === DEATH && t === INCOMING + 1.6) { burst(sx(0), HY - 2, 16, 40, 120, 0.3, 0.6, FXI.blood, 40); bloodUp(sx(0), HY - 2, 16, 120); sfx('fall', { w: 1 }); sfx('boss', { k: 'surgeonStab', w: 0.6 }); }
    if (s === DEATH && t === INCOMING + 2.3) { const m = L.mir; fx.cross(sx(m[0]), sy(m[1]), 9, 'frost', 0.4, 1); for (let i = 0; i < 30; i++) spawn(K_RISE, sx(-36 + Math.random() * 72), sy(-4 - Math.random() * 20), 0, -10 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.blood); sfx('boss', { k: 'surgeonGlint', w: 1 }); sfx('boss', { k: 'sink', w: 1 }); }
  }
  const EVENTS = [[0.4, 1.25, 1.5, 2.05], [1 / 12, 5 / 12], [1 / 12, 3 / 12], [], [], [], [], [INCOMING + 0.05, INCOMING + 0.7, INCOMING + 1.6, INCOMING + 2.3], []];
  function stepFX(dt, state, stT) {
    emT += dt; dpT += dt;
    if (emT > (P.hot ? 0.09 : 0.2)) { emT = 0; spawn(K_RISE, sx(-30 + Math.random() * 60), sy(-1), 0, -6 - Math.random() * 6, 0.4 + Math.random() * 0.3, FXI.blood); }   // 血面冒的小泡
    if (dpT > (P.hot ? 0.25 : 0.5) && state !== DEATH && !P.drop) { dpT = 0; const p = L.tip[1]; if (p[1] < -3 && L.d[1][1] > -0.3) spawnX(K_PHYS, sx(p[0]), sy(p[1] + 1), 0, 10, 0.8, FXI.blood, { g: 300, floor: HY + 2 });   // 刀尖滴血
      if (P.hot && P.gown) { const h = L.heart; spawnX(K_PHYS, sx(h[0] + 2), sy(h[1] + 4), 0, 8, 0.7, FXI.blood, { g: 260, floor: HY + 2 }); } }
    if (P.hot && state !== DEATH && Math.random() < 0.08) { const e = Math.random() < 0.5 ? L.eyeN : L.eyeF; spawn(K_RISE, sx(e[0]), sy(e[1]), 4, -8, 0.4, FXI.frost); }            // 眼眶里冒冷光
    if (state === CHARGE && MV === 'operate' && P.spot) {   // 额镜打出一道冷光，照在前下方的病人身上
      const m = L.mir; if (Math.random() < 0.7) { const q = Math.random(), x = m[0] + q * 60, y = m[1] + q * 70; spawn(K_EMBER, sx(x + (Math.random() - 0.5) * q * 14), sy(y), 0, 4, 0.25, FXI.frost); }
      if (Math.random() < 0.5) { const c = L.x, a = Math.random() * 6.2832, r = 10 + Math.random() * 10; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, FXI.frost, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 3 }); } }
    if (state === CHARGE && MV === 'cut' && Math.random() < 0.5) { const i = (Math.random() * 4) | 0, t = L.tip[i]; spawn(K_EMBER, sx(t[0]), sy(t[1]), -10, -6, 0.3, FXI.frost); }
    if (state === CHARGE && MV === 'stitch' && P.thr && Math.random() < 0.6) { const c = lerp(L.h[0], L.h[2], Math.random()), a = Math.random() * 6.2832, r = 6 + Math.random() * 8; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, FXI.holy, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (state === CHARGE && MV === 'poke' && Math.random() < 0.35) { const p = L.tip[0]; spawn(K_EMBER, sx(p[0]), sy(p[1] + 2), 0, 22, 0.4, FXI.blood); }
    if (state === CHARGE && MV === 'rise' && Math.random() < 0.5) spawnX(K_PHYS, sx(-20 + Math.random() * 50), sy(-2), (Math.random() - 0.5) * 60, -40 - Math.random() * 70, 0.7, FXI.blood, { g: 260, floor: HY + 4 });
    if (state === IDLE && P.scr && Math.random() < 0.4) sparks(lerp(L.h[0], L.h[1], 0.5), 1);
    if (state === CAST && MV === 'p2' && Math.random() < 0.5) { const h = L.heart; spawnX(K_PHYS, sx(h[0]), sy(h[1]), 20 + Math.random() * 40, -20 - Math.random() * 40, 0.6, FXI.blood, { g: 260, floor: HY + 4 }); }
    if (state === CHARGE && MV === 'p2' && stT >= 0.35 && stT - dt < 0.35) sfx('boss', { k: 'surgeonBeep', w: 1 });       // 第二声心电
  }
  function fxReset() { emT = 0; dpT = 0; }
  function fxBack(f12) { const x0 = sx(-50), x1 = sx(50); for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (((x + (f12 >> 1)) % 3) === 0) E.put(x, HY + 1, FXR[FXI.blood][P.hot ? 2 : 3]); }   // 脚下一线血面
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'operate'; return MVDUR[MV]; }

  // 自己的声音（mc-audio.js 的合成函数，参数同名同序）
  const VOICES = {
    surgeonGlint: (s, t, w, p) => { s.ring(t, 3600, 0.35, 0.03 + 0.03 * w, { pan: p, parts: [[1, 1], [2.1, 0.4], [3.3, 0.2]] }); s.nz(t, 0.05, 'highpass', 6000, 0.7, 0.02 * w, { pan: p }); },
    surgeonScrape: (s, t, w, p) => { s.nz(t, 0.22, 'bandpass', 5200, 3, 0.06 + 0.04 * w, { to: 3000, pan: p }); s.ring(t + 0.18, 2900, 0.3, 0.03 * w, { pan: p, parts: [[1, 1], [1.48, 0.5], [2.6, 0.2]] }); },
    surgeonClack: (s, t, w, p) => { for (const dt of [0, 0.09, 0.17]) { s.crackle(t + dt, 0.03, 2400, 0.1 * w, { pan: p }); s.thud(t + dt, 420, 200, 0.05, 0.05 * w, { pan: p }); } },
    surgeonRattle: (s, t, w, p) => { for (let i = 0; i < 10; i++) { const dt = i * 0.07 + s.rnd(0, 0.04); s.crackle(t + dt, 0.025, s.rnd(1800, 3200), 0.07 * w, { pan: p }); s.thud(t + dt, s.rnd(300, 520), 180, 0.04, 0.03 * w, { pan: p }); } },
    surgeonBeep: (s, t, w, p) => { s.tone(t, 'sine', 1000, 0.14, 0.05 + 0.04 * w, { pan: p }); s.thud(t, 70, 40, 0.25, 0.12 * w, { pan: p }); },
    surgeonFlat: (s, t, w, p) => { s.tone(t, 'sine', 1000, 2.2, 0.04 + 0.03 * w, { pan: p }); },
    surgeonLamp: (s, t, w, p) => { s.riser(t, t + 1.0, 600, 3200, 0.02 + 0.02 * w, { pan: p }); s.tone(t, 'square', 120, 1.0, 0.015 * w, { lp: 900, pan: p }); for (let i = 0; i < 3; i++) s.ring(t + 0.3 + i * 0.3, 2400 + i * 400, 0.2, 0.025 * w, { pan: p }); },
    surgeonSlice: (s, t, w, p) => { for (let i = 0; i < 4; i++) { s.whoosh(t + i * 0.03, 0.22, 900, 4200, 0.05 * w, { pan: p }); s.ring(t + i * 0.03, 3000 + i * 300, 0.2, 0.025, { pan: p }); } s.nz(t + 0.08, 0.2, 'bandpass', 900, 0.8, 0.07 * w, { to: 400, pan: p }); s.thud(t, 160, 60, 0.15, 0.1 * w, { pan: p }); },
    surgeonCut: (s, t, w, p) => { for (let i = 0; i < 4; i++) { s.whoosh(t + i * 0.06, 0.26, 500 + i * 150, 3600, 0.06 * w, { pan: p }); s.ring(t + 0.1 + i * 0.06, 2600 + i * 350, 0.18, 0.02, { pan: p }); } },
    surgeonPull: (s, t, w, p) => { s.tone(t, 'square', 700, 0.8, 0.015 + 0.01 * w, { to: 1400, lp: 2400, vib: [22, 30, 0.05], pan: p }); s.nz(t, 0.8, 'bandpass', 3000, 4, 0.03 * w, { to: 4200, pan: p }); },
    surgeonThread: (s, t, w, p) => { s.whoosh(t, 0.35, 1200, 5200, 0.07 * w, { pan: p }); s.tone(t, 'square', 1500, 0.2, 0.02 * w, { to: 600, lp: 2600, pan: p }); s.ring(t + 0.25, 1900, 0.3, 0.03 * w, { pan: p }); },
    surgeonStab: (s, t, w, p) => { s.nz(t, 0.28, 'bandpass', 900, 0.8, 0.08 * w, { to: 380, pan: p }); s.ring(t, 2300, 0.2, 0.03 * w, { pan: p }); s.blip(t + 0.1, 380, 0.04 * w, { pan: p }); },
    surgeonTear: (s, t, w, p) => { s.nz(t, 0.35, 'bandpass', 1600, 1.2, 0.1 * w, { to: 700, pan: p }); s.crackle(t + 0.05, 0.2, 2200, 0.08 * w, { pan: p }); s.thud(t, 90, 40, 0.3, 0.14 * w, { pan: p }); },
    surgeonRoar: (s, t, w, p) => { s.tone(t, 'sawtooth', 180, 1.3, 0.05 + 0.03 * w, { to: 130, vib: [5, 14, 0.1], lp: 1200, pan: p, rev: 0.6 }); s.nz(t, 1.1, 'bandpass', 1400, 1.4, 0.06 * w, { a: 0.08, to: 900, pan: p });
      s.choir(t, [45, 46], 1.4, 0.04 * w, { pan: p }); for (let i = 0; i < 6; i++) s.crackle(t + 0.1 + i * 0.12, 0.03, 2600, 0.05 * w, { pan: p }); },
    surgeonDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 260, 1.8, 0.05 + 0.03 * w, { to: 70, vib: [5, 20, 0.2], lp: 1100, pan: p, rev: 0.7 }); s.choir(t, [43, 44], 1.6, 0.035, { pan: p }); for (let i = 0; i < 8; i++) s.crackle(t + 0.9 + i * 0.09, 0.03, s.rnd(1600, 3000), 0.06 * w, { pan: p }); },
  };

  return {
    name: '院长', HX, R_EL: FXI.blood, DUR, hero, P, GLOW_MATS: [EB1, EB2, EB3, EB4, HT1, HT2, HT3, TH], HIT_POINT: [2, -36], EVENTS, MAX_H: 110, OWN_MAX: 40, SHEET_K: 2,
    SFX: { body: 'stone', how: 'dissolve', pal: 'blood', style: 'meteor', w: 1, hover: 1 }, VOICES,
    MOVES: ['operate', 'cut', 'stitch', 'poke', 'rise', 'p2'], MOVE_NAMES: { operate: '开刀', cut: '横切', stitch: '缝合', poke: '重击', rise: '升起', p2: '第二阶段仪式（缝合）' }, setMove,
    SHEET: [[IDLE, [0, 0.45, 1.3, 1.45, 2.1]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 5 / 12, 8 / 12]],
      [CHARGE, [0, 0.4, 0.8, 1.1], 'operate'], [CAST, [0, 2 / 12], 'operate'], [RECOVER, [0.3], 'operate'],
      [CHARGE, [0.2, 0.6, 1.0, 1.35], 'cut'], [CAST, [0, 2 / 12], 'cut'], [RECOVER, [0.3], 'cut'],
      [CHARGE, [0.2, 0.5, 0.9], 'stitch'], [CAST, [0, 2 / 12], 'stitch'], [RECOVER, [0.3], 'stitch'],
      [CHARGE, [0.5, 1.0], 'poke'], [CAST, [0], 'poke'],
      [CHARGE, [0, 0.8, 1.6, 2.1], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0, 0.2, 0.4], 'p2'], [CAST, [2 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.6, 1.0, 1.2, 1.5, 1.9, 2.3, 2.7]]],
    SINK: 28, portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
