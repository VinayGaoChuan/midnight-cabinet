// 自爆步兵（衍生单位 · 科技 · 战士 · 普通 · 近战 240）：火猪开战时召唤出来的矮墩墩军装小兵——土黄帆布短军装、小圆钢盔顶上一撮火焰形红缨（呼应火猪的火鬃）、
// 猪鼻滤罐防毒面具（呼应火猪的猪脸），双手在胸前抱着一颗几乎和身体一样大的黑铁圆炸弹，四周伸出 4 片风车刃（像一枚手里剑，呼应「装备手里剑」），顶上一根弯引信冒火花。
// 攻击 = 砸：把炸弹举过头顶，蹦起来往目标身上「咚」地一磕（火花溅一下，不爆）。技能 = 特性「自爆」：划火柴点燃引信 → 火花沿引信一格格往下跑 →
// 抱弹冲刺到目标跟前 → 蹲身闪白 → 半径 6 的极小火球 + 4 片飞刃 + 蘑菇烟，钢盔旋转飞上天再落地。死亡 = 爆裂：原地炸开，只剩钢盔被炸上天、转圈落下弹两下。
// 身体用 parts.rig（child 加圆）+ legs / torso / arm 拼；面具头、钢盔、红缨、手里剑炸弹、引信 + 火花、火柴是本模块的自画部件（候选部件）。
PCD.define('BoomSoldier', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_BURST,
    spawn, burst, ring, shake, flash, fx, death, hitDummy, dummyFx, put, scrX, floorGlow, bayer, sfx } = E;
  const RD = Math.round, PX = parts.px, RUN = parts.run;

  // ───── 元素：自爆 · 火焰（fire：白 → 淡黄 → 橙 → 红 → 深红）；烟 / 烟灰 dust；飞刃 steel ─────
  const R_EL = FXI.fire, EL = FXR[R_EL], R_SMOKE = FXI.dust, STL = FXR[FXI.steel];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    uni: { r: 'sand', band: 2 },                  // 土黄帆布军装（面积最大）
    boot: 'boot',                                 // 军靴 / 手套
    belt: 'leather',                              // 腰带 / 斜挎带 / 面具绑带
    rope: 'bone',                                 // 引信（浅色麻绳）
    gold: 'gold',                                 // 扣、护目镜铜框、滤罐铜环、炸弹铜帽
    helm: 'steel',                                // 小圆钢盔
    plume: 'fire',                                // 火焰形红缨（呼应火猪的火鬃）
    mask: 'moss',                                 // 防毒面具（暗段绿）
    lens: 'pale',                                 // 护目镜片
    bomb: [0, 0, 27, 29],                         // 黑铁弹体（亮面一格灰蓝，和银亮的刃拉开）
    blade: [27, 29, 30, 21],                      // 风车刃（银亮）
    wood: 'wood',                                 // 火柴杆
    ink: { r: 'ink', flat: 1 },
    spark: { r: [44, 46, 47, 21], flat: 1 },      // 引信火花 / 火柴火（发光体）
  });
  const BODY = { body: 'child', leg: 4, torso: 6, head: 7, headW: 7, sw: 4, arm: 7, lw: 2, belly: 1, stride: 2, lift: 2 };
  const HX = 76, DUR = DEFAULT_DUR.slice(), DASH = 8;
  const hero = new Sprite(72, 60, 34, 52);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 4, 8, 12], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['spark', 'belt', 'rope', 'lens', 'ink', 'wood', 'gold']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：hx/hy 前手（右手，靠镜头）· bhx/bhy 后手 · bmx/bmy 炸弹中心 · pl 红缨摆（负 = 往后）· fuse 引信烧掉的格数 · gem 火花档 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, bmx: 0, bmy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, sway: 0, beard: 0,
    lift: 0, pl: 0, gem: 0, glint: 0, fuse: 0, match: 0, eyes: 0, flash: 0, rim: 0, gone: 0, hatF: 0, hatX: 0, hatY: 0, hatR: 0, dq: 0, st: 0,
    gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (bmx, bmy, hx, hy, bhx, bhy, lean) => ({ bmx, bmy, hx, hy, bhx, bhy, lean: lean || 0 });
  const K_IDLE = K(8, -6, 6, -4, 10, -8);
  const K_BLOW = K(7, -8, 5, -6, 9, -10);           // 待机个性：把炸弹往脸前抬，对着引信吹气
  const K_WIND = K(3, -21, 3, -17, 5, -18, -1);     // 攻击预兆：炸弹举过头顶
  const K_ARC = K(10, -18, 8, -15, 12, -16);        // 出手：炸弹从头顶往前抡
  const K_SMASH = K(12, -13, 10, -10, 14, -14, 1);  // 接触：磕在假人身上
  const K_HOLD = K(11, -11, 9, -9, 13, -12, 1);
  const K_REACH = K(8, -6, 3, -5, 10, -8);          // 从腰间摸火柴
  const K_STRIKE = K(8, -6, 12, -10, 10, -8);       // 在右上那片刃上划火柴
  const K_LIGHT = K(8, -4, 9, -12, 10, -6);         // 炸弹放低、火柴头点到引信头
  const K_DASH = K(8, -6, 6, -4, 10, -8, 1);        // 抱弹压低冲刺
  const K_HUG = K(7, -5, 5, -3, 9, -7, 1);          // 施放：蹲身死死抱紧
  const K_HURT = K(7, -8, 5, -6, 9, -10, -1);
  const FIELDS = ['bmx', 'bmy', 'hx', 'hy', 'bhx', 'bhy', 'lean'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -16, 20], ['hy', -32, 3], ['bhx', -16, 20], ['bhy', -32, 3], ['bmx', -16, 20], ['bmy', -32, 3], ['lean', -1, 1], ['head', -1, 1],
    ['crouch', 0, 3], ['bob', 0, 1], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1]]);
  const KEY2 = parts.keyer([['lift', 0, 4], ['bx', -8, 8], ['pl', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['fuse', 0, 8], ['match', 0, 2], ['eyes', 0, 1], ['flash', 0, 1],
    ['rim', 0, 3], ['gone', 0, 2], ['hatF', 0, 1], ['hatX', -16, 15], ['hatY', 0, 40], ['hatR', 0, 3], ['dq', 0, 48, 48], ['st', 0, 8]]);
  const PL_IDLE = [0, -1, 0, 1];
  const T_SWING = 2 / 12, T_HIT = 3 / 12, T_STRIKE = 3 / 12, T_LIGHT = 5 / 12, T_BOOM = 3 / 12, T_DBOOM = 10 / 12;
  const FUSE = [[0, -5], [1, -6], [1, -7], [0, -8], [0, -9], [1, -10], [2, -11], [2, -12]];   // 引信从铜帽往上（炸弹中心为原点）

  // 钢盔被炸飞：从头顶的高度 y0 飞到 H 格高、边转边往后飘 dx，落地后弹两下；返回 [x, 离地高度, 朝向, 落地次数]
  const HAT_G = 600, HOPS = [[0.12, 3], [0.08, 1]];
  function hatFlight(tb, y0, H, dx) {
    const v0 = Math.sqrt(2 * HAT_G * (H - y0)), T = (v0 + Math.sqrt(v0 * v0 + 2 * HAT_G * y0)) / HAT_G;
    if (tb < T) return [dx * tb / T, y0 + v0 * tb - HAT_G * tb * tb / 2, Math.floor(tb * 14 + 1e-6) & 3, 0];
    let u = tb - T, x = dx;
    for (let i = 0; i < HOPS.length; i++) { const [d, h] = HOPS[i]; if (u < d) { const q = u / d; return [x - q, 4 * h * q * (1 - q), q < 0.5 ? 2 : 0, i + 1]; } u -= d; x -= 1; }
    return [x, 0, 0, 3];
  }
  const landTime = (y0, H) => { const v0 = Math.sqrt(2 * HAT_G * (H - y0)); return (v0 + Math.sqrt(v0 * v0 + 2 * HAT_G * y0)) / HAT_G; };
  const SK_Y0 = 13, SK_H = 26, SK_DX = -6, DT_Y0 = 15, DT_H = 30, DT_DX = -9;           // 技能 / 死亡的钢盔抛物线（离地高度按蹲姿时的帽檐行）
  const SK_LAND = landTime(SK_Y0, SK_H), DT_LAND = landTime(DT_Y0, DT_H);
  const q12up = (t) => Math.ceil(t * 12 - 1e-6) / 12;
  const T_SK_LAND = q12up(T_BOOM + SK_LAND - DUR[CAST]), T_SK_B1 = q12up(T_BOOM + SK_LAND + HOPS[0][0] - DUR[CAST]);
  const T_DT_LAND = q12up(T_DBOOM + DT_LAND), T_DT_B1 = q12up(T_DBOOM + DT_LAND + HOPS[0][0]);
  function setHat(tb, y0, H, dx) { const h = hatFlight(tb, y0, H, dx); P.hatF = 1; P.rim = 0; P.gem = 0; P.gone = 2; P.hatX = RD(h[0]); P.hatY = RD(h[1]); P.hatR = h[2]; }

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.sway = 0; P.beard = 0; P.head = 0; P.bob = 0; P.crouch = 0; P.lift = 0; P.pl = 0; P.gem = 0; P.glint = 0; P.fuse = 0; P.match = 0;
    P.eyes = 0; P.flash = 0; P.rim = 1; P.gone = 0; P.hatF = 0; P.hatX = 0; P.hatY = 0; P.hatR = 0; P.dq = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.pl = PL_IDLE[(b + 1) & 3]; P.glint = (f12 >> 1) & 1;
      const lp = tq % DUR[IDLE];
      for (const h0 of [0.5, 1.0]) if (lp >= h0 - 1e-6 && lp < h0 + 4 / 12 - 1e-6) {          // 紧张：原地小跳（蹲 → 起 → 落 → 蹲）
        const i = f12of(lp - h0); P.bob = 0; if (i === 0 || i === 3) { P.crouch = 1; P.pl = 1; } else { P.lift = i === 1 ? 2 : 1; P.pl = -1; P.bmy += i === 1 ? 1 : 0; P.hy += i === 1 ? 1 : 0; }
      }
      if (lp >= 1.5 - 1e-6 && lp < 2.25 - 1e-6) {                                            // 对着引信呼呼吹气：火花反而更旺
        const i = f12of(lp - 1.5); setK(K_IDLE, K_BLOW, i === 0 || i === 8 ? 0.5 : 1); P.bob = 0;
        P.gem = i >= 2 && i <= 7 ? ((i & 1) ? 2 : 1) : 0; P.pl = (i & 1) ? -1 : 0;
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                                  // 蹦跳：两脚几乎并着一蹦一蹦，炸弹在怀里颠、红缨甩
      setK(K_IDLE, K_IDLE, 0); const f = gait(tq); parts.gait(P, f);
      if (P.step) { P.crouch = 1; P.pl = 1; P.bmy += 1; P.hy += 1; P.bhy += 1; }
      else { P.lift = f === 1 ? 3 : 2; P.bob = 0; P.pl = -2; P.bmy -= 1; P.bhy -= 1; }
      P.glint = f & 1; const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                              // 砸：举过头顶 → 蹦起往前一磕 → 弹回
      if (tq < T_SWING - 1e-6) { setK(K_IDLE, K_WIND, ease.out(clamp01(tq / 0.12))); P.pl = -1; }
      else if (tq < T_HIT - 1e-6) { setK(K_ARC, K_ARC, 0); P.bx = 3; P.lift = 2; P.pl = -2; P.gem = 1; P.rim = 2; }
      else if (tq < 0.45) { const q = ease.out(clamp01((tq - T_HIT) / 0.2)); setK(K_SMASH, K_HOLD, q); P.bx = RD(5 - q); P.lift = RD(1 - q); P.pl = 2; P.gem = tq < 0.34 ? 2 : 1; P.rim = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(4 * (1 - q)); P.pl = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE) {                                                              // 划火柴 → 点引信 → 后缩 → 冲刺 → 到位发抖
      if (tq < 2 / 12 - 1e-6) { setK(K_IDLE, K_REACH, ease.inOut(clamp01(tq / 0.16))); P.match = tq >= 1 / 12 - 1e-6 ? 1 : 0; }
      else if (tq < T_STRIKE - 1e-6) { setK(K_REACH, K_STRIKE, 0.5); P.match = 1; }
      else if (tq < 4 / 12 - 1e-6) { setK(K_STRIKE, K_STRIKE, 0); P.match = 2; P.glint = 1; }
      else if (tq < 6 / 12 - 1e-6) { setK(K_LIGHT, K_LIGHT, 0); P.match = 2; P.glint = (f12 & 1); }
      else if (tq < 8 / 12 - 1e-6) { setK(K_DASH, K_DASH, 0); P.mx = -6; if (tq < 7 / 12 - 1e-6) { P.lift = 1; P.pl = 1; } else { P.crouch = 2; P.pl = -1; } }
      else if (tq < 14 / 12 - 1e-6) {                                                       // 冲刺：12 fps 小碎步
        setK(K_DASH, K_DASH, 0); const f = gait(tq, 12); parts.gait(P, f); P.crouch = 1; P.pl = -2;
        if (!P.step) { P.bmy -= 1; P.bhy -= 1; }
        P.mx = RD(-6 + (DASH + 6) * clamp01((tq - 8 / 12) / (6 / 12)));
      } else { setK(K_DASH, K_DASH, 0); P.mx = DASH; P.crouch = 2; P.bx = f12 & 1; P.pl = (f12 & 1) ? 1 : -1; P.eyes = 1; }
      if (tq >= T_LIGHT - 1e-6) { P.fuse = Math.min(8, Math.floor((tq - T_LIGHT) * 6 + 1e-6)); P.gem = P.fuse < 3 ? 1 : (f12 & 1) ? 2 : 1; P.rim = P.fuse < 3 ? 1 : 2; }
    } else if (st === CAST) {                                                                // 蹲身抱紧 → 闪白 → 发抖 → 3/12 s 引爆
      setK(K_HUG, K_HUG, 0); P.mx = DASH; P.crouch = 2; P.eyes = 1; P.gem = 3; P.rim = 3; P.fuse = Math.min(8, 6 + Math.floor(tq * 12 + 1e-6)); P.pl = 1;
      if (tq < 1 / 12 - 1e-6) P.flash = 1; else P.bx = f12 & 1;
      if (tq >= T_BOOM - 1e-6) setHat(tq - T_BOOM, SK_Y0, SK_H, SK_DX);
    } else if (st === RECOVER) {                                                             // 钢盔落地弹两下 → 消散；小兵在原位重新显形（演示循环）
      setK(K_IDLE, K_IDLE, 0); P.mx = DASH; P.rim = 0;
      if (tq < 6 / 12 - 1e-6) { setHat(DUR[CAST] - T_BOOM + tq, SK_Y0, SK_H, SK_DX); if (tq >= 5 / 12 - 1e-6) P.dq = 0.5; }
      else { P.mx = 0; P.dq = clamp01(1 - (tq - 5 / 12) / (4 / 12)); P.gem = 0; P.rim = 1; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.pl = 2; P.gem = 2; P.rim = 0; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.pl = 1; P.gem = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                                               // 爆裂：慌乱 → 火花一路烧到底 → 砰 → 只剩钢盔飞上天、弹两下 → 消散
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.pl = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 2 : 1; }
      else if (tq < T_DBOOM - 1e-6) { setK(K_HUG, K_HUG, 0); P.crouch = 2; P.bx = -2 + (f12 & 1); P.eyes = 1; P.pl = (f12 & 1) ? 2 : -2; P.fuse = Math.min(8, 4 + 4 * f12of(d - 0.3)); P.gem = 3; P.rim = 2; }
      else { setHat(tq - T_DBOOM, DT_Y0, DT_H, DT_DX); if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8); }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.lift = 0; P.crouch = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.gem = 1;
    }
    const yo = P.bob;
    for (const k of FIELDS) P[k] = RD(P[k]); P.hy += yo; P.bhy += yo; P.bmy += yo; P.crouch = RD(P.crouch);
    focus(); P.k1 = KEY1(P); P.k2 = KEY2(P);
  }
  function sparkLocal() { const n = 8 - P.fuse; return n > 0 ? [P.bmx + FUSE[n - 1][0], P.bmy + FUSE[n - 1][1] - 1] : [P.bmx, P.bmy - 5]; }
  function focus() {
    if (P.hatF) { P.gx = P.hatX + P.bx; P.gy = -P.hatY - 3; return; }
    const s = P.match && !P.fuse && P.gem === 0 && P.match === 2 ? [P.hx, P.hy - 5] : sparkLocal();
    P.gx = s[0] + P.bx; P.gy = s[1] - P.lift;
  }

  // ───── 自画部件 ─────
  const fr = (R, r0, x, y) => ({ r0: r0 & 3, tx: R.tx + x, ty: R.ty + y, rot: R.rot, ox: R.ox, oy: R.oy });
  // 候选部件：gasMaskHead —— 猪鼻防毒面具头（7 行包头面具 + 近侧 2×2 圆护目镜 + 铜框 + 远侧 1 格镜片 + 绑带 + 向前凸 2 格的猪鼻滤罐：铜环 + 两个鼻孔），一个部件
  const MASK = [[-2, 2], [-3, 3], [-3, 3], [-3, 3], [-3, 3], [-3, 2], [-2, 2]];
  function gasMaskHead(R) {
    E.part(); const c = R.hx, top = R.htop;
    for (let i = 0; i < MASK.length; i++) RUN(E, R, top + i, c + MASK[i][0], c + MASK[i][1], M.mask, 0);
    RUN(E, R, top + 2, c - 3, c - 2, M.belt, 3);                                              // 绑带
    PX(E, R, c - 1, top + 2, M.gold, 4); PX(E, R, c - 1, top + 3, M.gold, 2); PX(E, R, c + 2, top + 2, M.gold, 3);   // 铜框
    if (P.eyes) { PX(E, R, c, top + 2, M.lens, 1); PX(E, R, c + 1, top + 2, M.lens, 1); PX(E, R, c, top + 3, M.lens, 1); PX(E, R, c + 1, top + 3, M.lens, 2); PX(E, R, c + 3, top + 2, M.lens, 1); }
    else { PX(E, R, c, top + 2, M.lens, 4); PX(E, R, c + 1, top + 2, M.lens, 3); PX(E, R, c, top + 3, M.lens, 3); PX(E, R, c + 1, top + 3, M.lens, 2); PX(E, R, c + 3, top + 2, M.lens, 2); }
    for (let j = 3; j <= 5; j++) PX(E, R, c + 4, top + j, M.gold, j === 3 ? 4 : 2);         // 滤罐铜环
    PX(E, R, c + 5, top + 3, M.mask, 3); PX(E, R, c + 5, top + 4, M.mask, 4); PX(E, R, c + 5, top + 5, M.mask, 2);
    PX(E, R, c + 6, top + 4, M.mask, 3); PX(E, R, c + 6, top + 3, M.ink, 1); PX(E, R, c + 6, top + 5, M.ink, 1);   // 猪鼻滤罐前脸：两个鼻孔
    PX(E, R, c + 1, top + 5, M.mask, 2); PX(E, R, c + 2, top + 6, M.mask, 2);                 // 面具下颌褶
  }
  // 候选部件：steelPot —— 小圆钢盔（3 行圆顶 + 比头宽 2 格的帽檐 + 顶上铆钉高光），锚点 (0, 0) = 帽檐行中心；T 可以是跟身体的 frame 或飞在空中的自由 frame
  const POT = [[-2, -2, 1], [-1, -3, 2], [0, -4, 4]];
  function steelPot(T) {
    E.part();
    for (const [y, a, b] of POT) RUN(E, T, y, a, b, M.helm, 0);
    PX(E, T, -1, -2, M.helm, 4); PX(E, T, 1, -1, M.helm, 2); PX(E, T, 4, 0, M.helm, 3);
  }
  // 候选部件：flamePlume —— 盔顶火焰形红缨（3 格高、两个火舌尖；pl 让尖端前后摆，负 = 往后甩），锚点同 steelPot
  function flamePlume(T) {
    E.part(); const pl = P.pl, s = pl > 0 ? 1 : pl < 0 ? -1 : 0;
    RUN(E, T, -3, -2, 0, M.plume, 2);
    RUN(E, T, -4, -2 + s, -1 + s, M.plume, 3); PX(E, T, 0 + s, -4, M.plume, 2);
    PX(E, T, -2 + pl, -5, M.plume, 4); if (pl >= 0) PX(E, T, 0 + s, -5, M.plume, 3);
  }
  // 候选部件：shurikenBomb —— 手里剑炸弹：7×7 黑铁弹体（左上 steel 亮点）+ 4 片风车刃（顺时针勾，整体 11×11）+ 铜帽；锚点 = 弹体中心，一个部件
  const BALL = [1, 2, 3, 3, 3, 2, 1];
  const BLADE = [[2, -3], [3, -2], [3, -3], [4, -4], [5, -4]];
  function shurikenBomb(R) {
    E.part(); const cx = P.bmx, cy = P.bmy;
    for (let j = -3; j <= 3; j++) RUN(E, R, cy + j, cx - BALL[j + 3], cx + BALL[j + 3], M.bomb, 0);
    PX(E, R, cx - 1, cy - 2, M.blade, 4); PX(E, R, cx - 2, cy - 1, M.blade, 3); PX(E, R, cx + 2, cy + 1, M.bomb, 1);
    for (let r = 0; r < 4; r++) for (let i = 0; i < BLADE.length; i++) {
      let [x, y] = BLADE[i]; for (let k = 0; k < r; k++) { const s = x; x = -y; y = s; }
      PX(E, R, cx + x, cy + y, M.blade, i >= 3 ? 4 : i === 2 ? 3 : 2);
    }
    PX(E, R, cx, cy - 4, M.gold, 3); PX(E, R, cx - 1, cy - 4, M.gold, 4);
  }
  // 候选部件：fuseCord —— 弯引信（8 格，逐格亮暗像拧绳，从顶端一格格烧短）+ 引信头火花（发光体 5 档：0 闷燃 · 1 点燃 · 2 旺 · 3 施放 · 4 熄灭）
  function fuseCord(R) {
    const n = 8 - P.fuse;
    if (n > 0) { E.part(); for (let i = 0; i < n; i++) PX(E, R, P.bmx + FUSE[i][0], P.bmy + FUSE[i][1], M.rope, (i & 1) ? 3 : 4); }
    E.part(); const [x, y] = sparkLocal(), g = P.gem;
    if (g === 4) { PX(E, R, x, y, M.spark, 1); return; }
    if (g === 0) { PX(E, R, x, y, M.spark, 3); PX(E, R, x + (P.glint ? 1 : 0), y - 1, M.spark, 2); return; }
    PX(E, R, x, y, M.spark, 4);
    const L = g === 1 ? 1 : 2;
    for (let r = 1; r <= L; r++) { const c = g === 3 ? (r === 1 ? 4 : 3) : (r === 1 ? 3 : 2); PX(E, R, x + r, y, M.spark, c); PX(E, R, x - r, y, M.spark, c); PX(E, R, x, y - r, M.spark, c); if (r === 1 || g === 3) PX(E, R, x, y + r, M.spark, c); }
    if (g >= 2) { const d = P.glint ? 1 : -1; PX(E, R, x + d, y - 1, M.spark, 2); PX(E, R, x - d, y + 1, M.spark, 2); }
  }
  // 候选部件：matchStick —— 火柴（2 格木杆 + 红火柴头 + 点着时 2 格火苗），竖握在手里
  function matchStick(R) {
    E.part(); const x = P.hx, y = P.hy;
    PX(E, R, x, y - 2, M.wood, 4); PX(E, R, x, y - 3, M.wood, 3); PX(E, R, x, y - 4, M.plume, 1);
    if (P.match === 2) { E.part(); PX(E, R, x, y - 5, M.spark, 4); PX(E, R, x + (P.glint ? 1 : 0), y - 6, M.spark, 3); PX(E, R, x - 1, y - 5, M.spark, 2); }
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    const R = parts.rig(P, BODY);
    if (P.hatF) { const T = { r0: P.hatR & 3, tx: P.hatX, ty: -P.hatY, rot: 0, ox: 0, oy: 0 }; flamePlume(T); steelPot(T); return; }
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.uniD, grip: 'none' });
    parts.legs(E, R, P, { style: 'boot', mat: M.uni, matD: M.uniD, boot: M.boot, bootD: M.bootD, w: 2, bootH: 2 });
    parts.torso(E, R, P, { style: 'tunic', mat: M.uni, belt: M.belt, buckle: M.gold, strap: M.belt, hem: R.yHip + 1 });
    gasMaskHead(R);
    if (!P.gone) { const T = fr(R, 0, R.hx, R.htop); flamePlume(T); steelPot(T); }
    shurikenBomb(R);
    fuseCord(R);
    parts.hand(E, R, P, { side: 'B', hand: M.bootD, grip: 'fist' });                        // 后手从炸弹后面扒住右上沿
    parts.arm(E, R, P, { sleeve: 'loose', mat: M.uni, hand: M.boot, grip: 'fist' });
    if (P.match) matchStick(R);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let boomT = 9, boomX = 0, boomY = 0, bladeT = 9, charT = 9, charX = 0, charEnd = 0, sparkAcc = 0, dustAcc = 0, smokeAcc = 0, ashAcc = 0, soulAcc = 0, lastStep = 0, lastBlow = -1;
  const bX = new Float32Array(4), bY = new Float32Array(4), bVX = new Float32Array(4), bVY = new Float32Array(4), bStuck = new Uint8Array(4);
  const BL_V = [[95, -55], [-70, -95], [55, 35], [-55, 30]];
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  function sparkScr() { const s = sparkLocal(); return [sx(s[0] + P.bx), sy(s[1] - P.lift)]; }
  function boom(x, y, big) {                                                                  // 半径 6 的极小火球 + 飞刃 + 蘑菇烟 + 焦黑地面
    boomT = 0; boomX = x; boomY = y; bladeT = 0; charT = 0; charX = x; smokeAcc = 0;
    for (let k = 0; k < 4; k++) { bX[k] = x; bY[k] = y; bVX[k] = BL_V[k][0]; bVY[k] = BL_V[k][1]; bStuck[k] = 0; }
    burst(x, y, big ? 30 : 22, 30, big ? 120 : 95, 0.2, 0.5, R_EL, 6); ring(x, y, 0, R_EL);
    fx.cloud(x, y - 8, 5, R_SMOKE, 1.0, 2); fx.cloud(x, y - 3, 4, R_SMOKE, 0.7, 1);
    for (let i = 0; i < 5; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 10, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 8, 0.35 + Math.random() * 0.2, FXI.dust);
  }
  function onEnter(s) {
    if (s === CAST) { const [x, y] = sparkScr(); burst(x, y, 10, 30, 70, 0.15, 0.35, R_EL, 8); fx.cross(x, y, 5, R_EL, 0.2); shake(0.28, 2); flash(0.05); }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SWING) {                                                     // 从头顶往前抡：一道短弧拖影
      fx.slash(sx(2 + P.bx), sy(-8 - P.lift), 10, -0.3, 1.9, FXI.steel, 0.17, 2, 2); sfx('swing', { kind: 'smash', w: 0.35 });
    }
    if (s === ATTACK && t === T_HIT) {                                                       // 咚：撞击火花 + 引信火星溅一下（不爆）
      const x = sx(P.bmx + P.bx + 4), y = sy(P.bmy - P.lift);
      burst(x, y, 8, 30, 80, 0.15, 0.35, FXI.impact, 8); fx.cross(x, y, 4, FXI.impact, 0.15);
      const [kx, ky] = sparkScr(); burst(kx, ky, 6, 30, 70, 0.2, 0.4, R_EL, 14);
      hitDummy(0); sfx('hit', { mat: 'metal', w: 0.35 });
    }
    if (s === CHARGE && t === T_STRIKE) { burst(sx(P.hx + P.bx), sy(P.hy - 5), 5, 15, 45, 0.1, 0.25, R_EL, 6); }   // 火柴擦着
    if (s === CHARGE && t === T_LIGHT) { const [x, y] = sparkScr(); burst(x, y, 8, 20, 60, 0.15, 0.35, R_EL, 8); fx.cross(x, y, 3, R_EL, 0.15); }
    if (s === CHARGE && t === 8 / 12) { for (let i = 0; i < 6; i++) spawn(K_DUST, sx(-2) + (Math.random() - 0.5) * 4, HY - 1, -20 - Math.random() * 25, -4 - Math.random() * 8, 0.3 + Math.random() * 0.2, FXI.dust); }
    if (s === CAST && t === T_BOOM) {                                                        // 引爆
      boom(sx(K_HUG.bmx), sy(K_HUG.bmy), 0);
      hitDummy(1, 1); dummyFx({ dur: 1.2, tint: 'fire' }); shake(0.12, 1); sfx('impact', { pal: 'fire', w: 0.4 });
    }
    if (s === CAST && t === 5 / 12) { fx.cloud(boomX, boomY - 15, 7, R_SMOKE, 1.2, 2); fx.cloud(boomX - 1, boomY - 20, 5, R_SMOKE, 1.0, 2); }         // 蘑菇烟帽
    if ((s === RECOVER && (t === T_SK_LAND || t === T_SK_B1)) || (s === DEATH && (t === T_DT_LAND || t === T_DT_B1))) {   // 钢盔落地：当啷
      const x = sx(P.hatX); for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 14, -3 - Math.random() * 4, 0.3, FXI.dust);
      sfx('hit', { mat: 'metal', w: t === T_SK_LAND || t === T_DT_LAND ? 0.2 : 0.1 });
    }
    if (s === HURT && t === INCOMING) { const [x, y] = sparkScr(); burst(x, y, 4, 20, 50, 0.15, 0.3, R_EL, 10); }
    if (s === DEATH && t === T_DBOOM) {                                                      // 砰：先画好不带钢盔的这一帧交给死亡套件炸成碎块，钢盔单独飞
      poseAt(DEATH, T_DBOOM - 1 / 12, E.simT); P.flash = 0; P.gem = 3; P.gone = 1; P.k1 = KEY1(P); P.k2 = KEY2(P); drawHero(); bakeHero();
      const bx0 = P.bmx + P.bx, by0 = P.bmy;
      death.start('burst', { power: 0.9, chunk: 3, fromX: bx0, fromY: by0, fadeAt: 0.8, fadeDur: 0.5, ramp: 'soul' });
      boom(sx(bx0), sy(by0), 1); fx.cloud(sx(bx0), sy(by0) - 14, 6, R_SMOKE, 1.2, 2);
      shake(0.22, 2); flash(0.05); sfx('impact', { pal: 'fire', w: 0.35 });
      poseAt(DEATH, T_DBOOM, E.simT); hero.k1 = hero.k2 = -1;
    }
  }
  const EVENTS = [[], [], [T_SWING, T_HIT], [T_STRIKE, T_LIGHT, 8 / 12], [T_BOOM, 5 / 12], [T_SK_LAND, T_SK_B1], [INCOMING], [T_DBOOM, T_DT_LAND, T_DT_B1], []];
  function stepFX(dt, state, stT) {
    const live = !P.hatF && !P.gone;
    if (live && (state === CHARGE && stT >= T_LIGHT || state === CAST || state === DEATH && stT > INCOMING + 0.3)) {   // 引信嘶嘶：火星往外溅
      sparkAcc += dt * (state === CHARGE ? 16 : 34); const [x, y] = sparkScr();
      while (sparkAcc >= 1) { sparkAcc -= 1; const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, v = 20 + Math.random() * 30; spawn(K_BURST, x, y, Math.cos(a) * v, Math.sin(a) * v, 0.15 + Math.random() * 0.15, R_EL); }
    }
    if (state === IDLE && live) {
      const lp = stT % DUR[IDLE], i = lp >= 1.5 && lp < 2.25 ? f12of(lp - 1.5) : -1;
      if (i !== lastBlow) {
        if (i >= 1 && i <= 7 && (i & 1)) {                                                  // 呼：从猪鼻吹出一口气
          const nx = sx(R_HX() + 6 + P.bx), ny = sy(R_HTOP() + 4 - P.lift);
          for (let k = 0; k < 3; k++) spawn(K_DUST, nx, ny + (k - 1) * 0.6, 40 + Math.random() * 20, -30 - Math.random() * 20, 0.2 + Math.random() * 0.1, FXI.dust);
        }
        if (i >= 2 && i <= 7 && !(i & 1)) { const [x, y] = sparkScr(); burst(x, y, 4, 15, 45, 0.15, 0.35, R_EL, 10); }   // 火花反而更旺
        lastBlow = i;
      }
      if (Math.random() < dt * 1.5) { const [x, y] = sparkScr(); spawn(K_EMBER, x, y - 1, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.4 + Math.random() * 0.3, R_EL); }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.2 }); spawn(K_DUST, sx(0), HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.3, FXI.dust); } lastStep = P.step; }
    if (state === CHARGE && stT >= 8 / 12 && stT < 14 / 12) {                                  // 冲刺扬尘
      dustAcc += dt * 26; while (dustAcc >= 1) { dustAcc -= 1; spawn(K_DUST, sx(-3) + (Math.random() - 0.5) * 3, HY - Math.random() * 2, -15 - Math.random() * 20, -4 - Math.random() * 8, 0.3 + Math.random() * 0.2, FXI.dust); }
    }
    if (boomT < 0.45) {                                                                       // 蘑菇烟柱：烟从爆点往上升
      smokeAcc += dt * 40; while (smokeAcc >= 1) { smokeAcc -= 1; spawn(K_RISE, boomX + (Math.random() - 0.5) * 3, boomY - Math.random() * 3, (Math.random() - 0.5) * 6, -30 - Math.random() * 20, 0.45 + Math.random() * 0.3, R_SMOKE); }
    }
    if (state === RECOVER || state === DEATH && stT > T_DBOOM + 0.3) {                           // 飘落的烟灰
      ashAcc += dt * 10; while (ashAcc >= 1) { ashAcc -= 1; spawn(K_DUST, charX + (Math.random() - 0.5) * 18, HY - 18 - Math.random() * 10, (Math.random() - 0.5) * 6, 8 + Math.random() * 6, 1.0 + Math.random() * 0.5, R_SMOKE); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) {
      soulAcc += dt * 16; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, sx(P.hatX) - 4 + Math.random() * 8, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); }
    }
    if (bladeT < 1.5) for (let k = 0; k < 4; k++) {                                          // 飞刃：抛物线，钉进假人或插进地里
      if (bStuck[k]) continue; bVY[k] += 260 * dt; bX[k] += bVX[k] * dt; bY[k] += bVY[k] * dt;
      if (bVX[k] > 0 && bX[k] >= DUMMY_X - 3 && bY[k] < HY - 4) { bX[k] = DUMMY_X - 3; bStuck[k] = 1; }
      if (bY[k] >= FLOOR - 1) { bY[k] = FLOOR - 1; bStuck[k] = 2; }
    }
    boomT += dt; bladeT += dt; charT += dt;
  }
  const R_HX = () => parts.rig(P, BODY).hx, R_HTOP = () => parts.rig(P, BODY).htop;
  function fxReset() { boomT = 9; bladeT = 9; charT = 9; sparkAcc = 0; dustAcc = 0; smokeAcc = 0; ashAcc = 0; soulAcc = 0; lastStep = 0; lastBlow = -1; }
  const CHAR_LIFE = 1.6;
  function fxBack(f12) {
    if (!P.hatF && P.dq < 1) floorGlow(sx(P.gx), P.rim, EL, f12);
    if (charT < CHAR_LIFE) {                                                                  // 一圈焦黑地面：外圈黑、内圈暗灰，最后抖动褪去
      const fade = clamp01((charT - CHAR_LIFE + 0.4) / 0.4);
      for (let dx = -9; dx <= 9; dx++) {
        const x = RD(charX) + dx, a = Math.abs(dx); if (bayer(x, FLOOR) < fade) continue;
        put(x, FLOOR, a >= 4 ? (a === 9 && (x & 1) ? 9 : 0) : 8);
        if (a <= 6 && ((x + 1) & 1 || a < 3)) put(x, FLOOR + 1, a < 3 ? 0 : 8);
      }
      if (charT < 0.5) for (let dx = -6; dx <= 6; dx += 2) put(RD(charX) + dx, FLOOR - 1, charT < 0.25 ? EL[3] : EL[4]);   // 地面余火
    }
  }
  function drawFireball() {                                                                   // 半径 6：第 1 帧白芯，之后逐帧变暗、抖动断开、往上飘
    const k = Math.floor(boomT * 12 + 1e-6); if (k > 4) return;
    const R0 = [4, 6, 6, 6, 5][k], up = [0, 0, 1, 2, 3][k], cut = [0, 0, 0.25, 0.5, 0.72][k];
    for (let j = -R0; j <= R0; j++) for (let i = -R0; i <= R0; i++) {
      const d = Math.hypot(i, j * 1.1); if (d > R0 + 0.3) continue;
      const x = RD(boomX) + i, y = RD(boomY) + j - up; if (y > FLOOR) continue; if (bayer(x, y) < cut) continue;
      const q = d / R0; let c;
      if (k === 0) c = q < 0.75 ? EL[0] : EL[1];
      else if (k === 1) c = q < 0.4 ? EL[0] : q < 0.75 ? EL[1] : EL[2];
      else if (k === 2) c = q < 0.35 ? EL[1] : q < 0.7 ? EL[2] : EL[3];
      else if (k === 3) c = q < 0.5 ? EL[2] : EL[3];
      else c = q < 0.5 ? EL[3] : EL[4];
      put(x, y, c);
    }
  }
  function drawBlades(f12) {                                                                  // 手里剑飞刃：3 格斜条，飞行中逐帧换斜向（在转），钉住后不动
    if (bladeT >= 1.5) return; const fade = bladeT > 1.1;
    for (let k = 0; k < 4; k++) {
      if (fade && ((f12 + k) & 1)) continue;
      const x = RD(bX[k]), y = RD(bY[k]), spin = bStuck[k] ? k & 1 : (f12 + k) & 1, d = spin ? 1 : -1, c = bladeT < 0.1 ? STL[0] : STL[1];
      put(x, y, c); put(x + 1, y + d, STL[2]); put(x - 1, y - d, STL[2]); if (!bStuck[k]) put(x + 1, y - d, STL[3]);
    }
  }
  function fxFront(f12) {
    if (death.active && P.hatF) {                                                            // 死亡套件接管时引擎不画本体：钢盔自己贴上去
      const o = hero.out, w = hero.w;
      for (let y = 0; y < hero.h; y++) for (let x = 0; x < w; x++) { const c = o[y * w + x]; if (c !== 255) put(sx(x - hero.ox), HY + y - hero.oy, c); }
    }
    if (boomT < 0.5) drawFireball();
    drawBlades(f12);
  }

  return {
    name: '自爆步兵', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.spark], HIT_POINT: [2, -10], EVENTS,
    deathKit: { mode: 'burst', at: T_DBOOM }, REVIVE: { dy: -9 },
    SFX: { body: 'flesh', how: 'explode', pal: 'fire', style: 'fire', w: 0.35 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
