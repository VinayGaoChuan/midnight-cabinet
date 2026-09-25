// 炎帝（部队 · 不死 · 战士 · 传说）：赤十字攒下的魂在这一级烧成了帝焰。斗笠变成暗金鳞片拼的尖锥火冠（帽檐一圈金焰、锥尖一簇冠焰），
// 背上的龟壳化成焰壳（壳脊一排火焰）、下面垂着焦黑长披风；暗金鳞甲长袍及地、前面开衩，胸前交叉的朱红带成了金边红绶带；
// 双手帝焰巨钩镰（暗金柄、钢刃包金、刃口和背后弯钩都烧着金焰）；身边环绕游动三条金焰火鱼——就是攒下的层数。
// 攻击 = 上挑（从身后下方撩到身前上方，130° 上挑弧，刃口甩出火星）；技能 = 特性「精英渔夫」：把火鱼全部吞进胸口、冠焰长高，
// 全身爆燃、头顶一道金焰光柱冲天，钩镰插地，一道金焰地浪推到假人把它点燃。升级自「赤十字」（RedCross.js）。
PCD.define('EmperorOfFlame', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, keyer, hash, fxRamp,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_BURST, K_TRAIL, K_EMBER, K_STILL,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, dummyFx, death, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2, px = parts.px;
  const quad = (a) => ((RD(a / HALF) % 4) + 4) % 4;
  const rotUV = (q, u, v) => (q === 0 ? [u, v] : q === 1 ? [-v, u] : q === 2 ? [-u, -v] : [v, -u]);
  function bres(x0, y0, x1, y1, cb) {
    x0 = RD(x0); y0 = RD(y0); x1 = RD(x1); y1 = RD(y1);
    const ax = Math.abs(x1 - x0), ay = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = ax + ay;
    for (let n = 0; n < 200; n++) { cb(x0, y0, n); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= ay) { e += ay; x0 += sx; } if (e2 <= ax) { e += ax; y0 += sy; } }
  }

  // ───── 元素：精英渔夫 · 帝焰（21 白 → 51 圣光淡金 → 14 金 → 46 橙 → 45 赤橙）：金多橙少，和指挥官以橙红为主的火药火拉开 ─────
  const R_EL = fxRamp('imperial', [21, 51, 14, 46, 45]), EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质 ─────
  const SCALE = ['#2a1a06', '#6a4410', '#b07a1e', '#e8b84a'], CHAR = ['#0c0a0a', '#1e1a1a', '#342c2a', '#504440'], ASH = ['#1a1614', '#3a3230', '#5e5450', '#867a72'], SHELL = ['#141a0c', '#2e3a1a', '#4e5a2a', '#7a8446'];
  const M = parts.mats(E, {
    robe: { r: SCALE, band: 2 }, scale: SCALE, crown: SCALE, cape: { r: CHAR, band: 2 }, boot: CHAR, skin: ASH, shell: SHELL, sash: 'crimson', gold: 'gold', steel: 'steel',
    eye: { r: [14, 51, 21, 21], flat: 1 },                                              // 白金色的魂火眼
    flame: { r: [45, 46, 47, 51], flat: 1 },                                            // 冠焰、檐焰、壳脊火、刃口金焰（发光体）
    fish: { r: [45, 46, 14, 51], flat: 1 },                                             // 环绕的金焰火鱼（发光体）
  });
  const BODY = { body: 'tall', leg: 11, torso: 11, sw: 5, arm: 11, lw: 3, limb: 1.3, stride: 2 };
  const R0 = parts.rig({}, BODY);
  const GG = { len: 14, back: 14 };
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(96, 64, 46, 58);
  const wsp = new Sprite(hero.w, hero.h, hero.ox, hero.oy);                             // 死亡时单独画的钩镰（身体化灰后它还立着，最后倒地）
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 13, 18], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['eye', 'flame', 'fish', 'skin', 'steel', 'gold']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  const WB = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 };

  // ═════ 候选部件（本模块自带，以后统一收进 parts.js）═════
  // 候选部件：火冠 fireCrown —— 步卒斗笠的尖锥轮廓，暗金鳞片拼成（鳞纹逐行错开），帽檐那一行隔格燃着金焰、两端各窜一条 2 格火舌，
  //   锥尖一簇冠焰（cf 格高，底 2 格宽、上面 1 格左右跳）。o = { mat, flame, cf, fl 火苗相位 }。部件：冠 → 檐焰 / 冠焰（发光体）。
  const HAT_ROWS = [[-3, 0, 1], [-2, -1, 2], [-1, -3, 4], [0, -4, 5], [1, -5, 6]];
  function fireCrown(E, R, P, o) {
    const T = { r0: 0, tx: R.hx, ty: R.htop, rot: R.rot, ox: R.ox, oy: R.oy }, m = o.mat, fl = o.fl ? 1 : 0;
    E.part();
    for (const [v, a, b] of HAT_ROWS) for (let u = a; u <= b; u++) px(E, T, u, v, m, v < 1 && ((u + v * 2 + 30) % 3 === 0) ? 2 : 0);
    px(E, T, 0, -3, m, 4); px(E, T, -2, -1, m, 4);
    E.part(); const f = o.flame;
    for (let u = -5; u <= 6; u++) if (((u + fl) & 1) === 0) px(E, T, u, 1, f, 3);                       // 帽檐一圈金焰
    px(E, T, -6, 0, f, 3); px(E, T, -6 - fl, -1, f, 4); px(E, T, 7, 0, f, 3); px(E, T, 7 + (1 - fl), -1, f, 4);   // 两端火舌
    const cf = o.cf || 0;
    for (let k = 0; k < cf; k++) { const v = -4 - k, top = k === cf - 1; if (k < 2) { px(E, T, 0, v, f, k ? 3 : 2); px(E, T, 1, v, f, k ? 4 : 3); } else px(E, T, ((k + fl) & 1) ? 0 : 1, v, f, top ? 4 : 3); }
  }
  // 候选部件：龟壳 turtleShell（焰壳）—— 步卒的龟壳；本级 ridge：壳的后上沿一排火舌（长短相间、随 fl 跳），和壳分开一个部件（发光体）。
  function turtleShell(E, R, cx, cy, rx, ry, o) {
    const m = o.mat, X = Math.ceil(rx), Y = Math.ceil(ry), sy = Math.max(1, RD(ry * 0.4));
    E.part();
    for (let j = -Y; j <= Y; j++) for (let i = -X; i <= X; i++) {
      const e = (i * i) / (rx * rx + 0.3) + (j * j) / (ry * ry + 0.3); if (e > 1) continue;
      let t = 0;
      if (e > 0.6) t = ((i * 2 + j + 40) % 3 === 0) ? 2 : 0;
      else if (Math.abs(i) <= 1 && (j === -sy || j === sy)) t = 2;
      else if (Math.abs(i) === 2 && Math.abs(j) <= sy + 1) t = 2;
      else if (i === -1 && j === -sy - 1) t = 4;
      px(E, R, cx + i, cy + j, m, t);
    }
    if (!o.ridge) return;
    E.part(); const fl = o.fl ? 1 : 0;
    for (let k = 0; k <= 6; k++) { const a = Math.PI * 0.95 + k / 6 * Math.PI * 0.6, x = RD(cx + Math.cos(a) * (rx + 1)), y = RD(cy + Math.sin(a) * (ry + 1)), L = ((k + fl) & 1) ? 2 : 1; for (let s = 0; s < L; s++) px(E, R, x - (s && k < 3 ? 1 : 0), y - s, o.ridge, s ? 4 : 3); }
  }
  // 候选部件：交叉绶带 sash —— 胸前两条 1 格红带交叉成 X（单独一个部件：压在袍子上的分界线就是一道暗金边），交叉处一颗金扣。
  function sash(E, R, m, clasp) {
    const e0 = parts.edges(R, R.yS + 1), e1 = parts.edges(R, R.yS + 6), cx = RD((e1[0] + e1[1]) / 2) + 2, cy = R.yS + 4;
    E.part(); parts.line(E, R, cx - 3, R.yS + 1, cx + 3, R.yS + 7, m, 3); parts.line(E, R, cx + 3, R.yS + 1, cx - 3, R.yS + 7, m, 2);
    px(E, R, cx, cy, clasp, 4); px(E, R, cx + 1, cy, clasp, 3); px(E, R, cx, cy + 1, clasp, 2);
  }
  // 候选部件：火鱼 flameFish —— 5 格长的小鱼（头亮、身金、尾分叉暗一级），dir 1 朝右 / −1 朝左；发光体（勾线是赤橙色，像一圈火边）。一个部件。
  const FISH_C = [[0, 0, 4], [-1, 0, 3], [-2, 0, 3], [-3, 0, 2], [-1, 1, 2], [-2, -1, 3], [-4, -1, 2], [-4, 1, 2]];
  function flameFish(E, R, x, y, dir, m) { E.part(); for (const [dx, dy, t] of FISH_C) px(E, R, x + dx * dir, y + dy, m, t); }
  // 候选部件：帝焰巨钩镰 greatGlaive —— 11×11 刀头：刀背包金、钢刃、刃口一列金焰（发光体，和刃同一个部件，隔行往外多窜 1 格、随 fl 跳），
  //   刃根背后一只往下弯的金钩（钩尖也烧着），钩尖和柄之间 4 格空；只按 90° 换朝向，暗金柄每 5 格一道金箍。o = { wood, metal, gold, flame, len, back, at, a, free }
  const GREAT = ['.....FE....', '.....MME...', '.....MMME..', '.....GMMME.', '.....GMMmE.', '.....GMMmE.', '.....GMmE..', 'IIIIIGmE...', 'I....GM....', 'F....M.....', 'F....T.....'];
  function greatGlaive(E, R, P, o) {
    const T = o.free ? parts.FREE : R, g = o.at || [P.hx, P.hy], a = o.a != null ? o.a : P.a, dx = Math.sin(a), dy = -Math.cos(a), q = quad(a), fl = P.fl ? 1 : 0;
    const ax = RD(g[0] + dx * o.len), ay = RD(g[1] + dy * o.len), bx = RD(g[0] - dx * o.back), by = RD(g[1] - dy * o.back);
    E.part(); bres(bx, by, ax, ay, (x, y, n) => px(E, T, x, y, (n % 5) === 2 ? o.gold : o.wood, (n % 5) === 2 ? 4 : 3));
    E.part();
    for (let r = 0; r < 11; r++) for (let c = 0; c < 11; c++) {
      const ch = GREAT[r][c]; if (ch === '.') continue; const d = rotUV(q, c - 5, r - 10), X = ax + d[0], Y = ay + d[1];
      if (ch === 'E' || ch === 'F') { px(E, T, X, Y, o.flame, ((r + fl) & 1) ? 4 : 3); if (ch === 'E' && ((r + fl) % 3) === 0) { const e = rotUV(q, c + 1 - 5, r - 10); px(E, T, ax + e[0], ay + e[1], o.flame, 4); } }
      else px(E, T, X, Y, ch === 'G' || ch === 'I' || ch === 'T' ? o.gold : o.metal, ch === 'm' ? 2 : 0);
    }
    const tip = rotUV(q, 6, -10); return { tip: [ax + tip[0], ay + tip[1]], socket: [ax, ay], butt: [bx, by] };
  }

  // ───── 姿势：前手握钩镰（hx hy a），后手（bhx bhy）：双手时握在柄上 / 抚鱼时平托在身前 ─────
  const P = { hx: 0, hy: 0, a: 0, ai: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, dq: 0, dqi: 0, st: 0, two: 0, tf: 0, orb: 0, orbR: 4, fishN: 3, palm: 0, cf: 4, fl: 0, wpn: 1,
    gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(8, -14, 0.1, -4, -12, 0, 0);            // 钩镰拄在身前，柄尾点地
  const K_PALM = K(8, -14, 0.1, 6, -18, 0, 0);             // 抚鱼：左手平托在身前
  const K_WALK = K(8, -16, 0.1, -4, -12, 0, 0);
  const K_WIND = K(3, -16, -2.3, 0, 0, -1, -1, 1);         // 刀头拖到身后下方（贴着地面）
  const K_LIFT = K(10, -18, 1.0, 0, 0, 1, 1);              // 撩到身前上方
  const K_HOLD = K(9, -17, 0.7, 0, 0, 0, 0);
  const K_GATHER = K(8, -14, 0.15, -4, -12, -1, -1);       // 挺胸抬下巴，吞鱼
  const K_BLAZE = K(5, -22, 0.0, 0, 0, -1, -1);            // 爆燃：钩镰高举
  const K_PLUNGE = K(6, -15, 2.9, 0, 0, 1, 1, 1);          // 钩镰向前插地
  const K_HURT = K(6, -14, -0.1, -5, -12, -1, -1);
  const K_STAND = K(7, -13, 0.1, -4, -12, 0, -1);          // 站着不倒
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = keyer([['hx', -32, 31], ['hy', -48, 15], ['ai', -32, 32], ['bhx', -32, 31], ['bhy', -48, 15], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['bx', -8, 8], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['beard', -3, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['dqi', 0, 48], ['st', 0, 8], ['two', 0, 1], ['tf', 0, 1], ['orb', 0, 23], ['orbR', 0, 4], ['fishN', 0, 3], ['palm', 0, 1], ['cf', 0, 7], ['fl', 0, 1], ['wpn', 0, 1]]);
  const SWAY_IDLE = [0, 1, 0, -1];
  const T_LIFT = 2 / 12, SWALLOW = [0.45, 0.8, 1.15], T_PLUNGE = 2 / 12, T_WHIT = 4 / 12, T_ASH = INCOMING + 0.9, T_TOPPLE = INCOMING + 2.0, T_CLANG = INCOMING + 2.25;
  const swallowed = (tq) => (tq >= SWALLOW[0]) + (tq >= SWALLOW[1]) + (tq >= SWALLOW[2]);

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    P.two = 0; P.tf = 0; P.orb = RD(TT * 10) % 24; P.orbR = 4; P.fishN = 3; P.palm = 0; P.cf = 4 + ((f12 >> 1) & 1); P.fl = f12 & 1; P.wpn = 1;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.45 && lp < 2.05) {                                   // 待机个性：左手平托，一条火鱼游到掌心上方停一下再游开
        const q = lp < 1.6 ? ease.out((lp - 1.45) / 0.15) : lp < 1.9 ? 1 : 1 - ease.inOut((lp - 1.9) / 0.15);
        setK(K_IDLE, K_PALM, q); P.tf = 1; P.palm = lp >= 1.6 && lp < 1.9 ? 1 : 0; P.glint = P.palm; P.head = P.palm;
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 帝王缓步：步幅小，上身几乎不动，钩镰随步点晃，披风拖地
      setK(K_WALK, K_WALK, 0); parts.gait(P, E.gait(tq)); P.a += P.step * 0.05; P.hy += P.step ? 0 : -1;
      const w = walkDemo(tq, 10, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                        // 上挑：刀头拖到身后下方 → 从下往前上撩起（130° 弧）→ 收回
      P.two = 1;
      if (tq < 0.12) setK(K_IDLE, K_WIND, ease.out(tq / 0.12));
      else if (tq < 0.2) { setK(K_LIFT, K_LIFT, 0); P.bx = 3; P.sway = -1; P.glint = 1; P.cf = 6; }
      else if (tq < 0.45) { setK(K_LIFT, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.bx = 2; P.cf = 5; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(2 * (1 - q)); P.two = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE) {                                        // 吞鱼：火鱼一条条螺旋收进胸口，每吞一条冠焰长高 1 格、轮廓光升一档
      const q = ease.inOut(clamp01(tq / 0.5)), n = swallowed(tq); setK(K_IDLE, K_GATHER, q);
      P.orb = RD(TT * 20) % 24; P.fishN = 3 - n; P.orbR = Math.max(1, 4 - Math.floor(tq / 0.35)); P.cf = 4 + n; P.rim = Math.min(3, 1 + n); P.gem = tq < 0.7 ? 1 : 2;
      P.sway = (f12 & 1) ? -1 : 0; if (tq >= 1.1) P.bx = (f12 & 1) ? 1 : 0;
    } else if (st === CAST) {                                          // 全身爆燃（白闪 1 帧）→ 钩镰高举 → 向前插地
      P.fishN = 0; P.cf = 7; P.rim = 3; P.gem = 3; P.two = 1; P.sway = -1;
      if (tq < T_PLUNGE) { setK(K_BLAZE, K_BLAZE, 0); P.flash = tq < 1 / 12 ? 1 : 0; }
      else setK(K_PLUNGE, K_PLUNGE, 0);
    } else if (st === RECOVER) {                                       // 冠焰降回 4 格，三条火鱼从胸口重新游出
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_PLUNGE, K_IDLE, q); P.two = q < 0.4 ? 1 : 0;
      P.cf = Math.max(4, 7 - Math.floor(tq / 0.12)); P.fishN = tq < 0.15 ? 0 : 3; P.orbR = Math.min(4, Math.max(1, 1 + Math.floor((tq - 0.15) / 0.12)));
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.3 ? 2 : q < 0.7 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.cf = 3; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 燃尽：站着不倒 → 冠焰先熄 → 从冠顶往下化成火灰（死亡套件 ash，帝焰色阶）→ 钩镰最后「当」地倒下
      const d = tq - INCOMING;
      if (d < 0) idle();
      else {
        P.fishN = 0;                                                   // 火鱼四散逃开（特效）
        if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
        else { setK(K_STAND, K_STAND, 0); P.gem = d < 0.7 ? ((f12 & 1) ? 1 : 4) : 4; P.eyes = d >= 0.7 ? 1 : 0; }
        P.cf = d < 0.3 ? 4 : d < 0.45 ? RD(4 * (1 - (d - 0.3) / 0.15)) : 0;
        if (d >= 0.9) { P.dq = 1; P.wpn = 0; }                          // 之后由死亡套件接管，钩镰单独画
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.a = RD(P.a / ASTEP) * ASTEP; P.ai = RD(P.a / ASTEP);
    if (P.two) { const b = parts.onShaft(P, {}, -5); P.bhx = b[0]; P.bhy = b[1]; } else { P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; }
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dqi = RD(P.dq * 48);
    const R = parts.rig(P, BODY); P.gx = RD((parts.edges(R, R.yS + 4)[0] + parts.edges(R, R.yS + 4)[1]) / 2) + 1 + P.bx; P.gy = R.yS + 4;   // 发光体 = 胸口（吞鱼的地方）
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  function fishPos(R, k) {                                             // 第 k 条火鱼：绕胸口的扁椭圆轨道游；抚鱼时第 0 条停在掌心上方
    if (P.palm && k === 0) return [P.bhx + 1, P.bhy - 3, -1, 1];
    const th = (P.orb / 24 + k / 3) * 6.2832, r = P.orbR / 4, s = Math.sin(th);
    return [RD(Math.cos(th) * 12 * r), RD(R.yS + 7 + s * 3 * r), s > 0 ? -1 : 1, s];
  }
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY), sk = M.skin, skD = M.skinD, eye = P.gem >= 4 ? 0 : M.eye;
    for (let k = 0; k < P.fishN; k++) { const f = fishPos(R, k); if (f[3] < 0) flameFish(E, R, f[0], f[1], f[2], M.fish); }   // 身后那半圈的火鱼
    parts.cape(E, R, P, { style: 'tattered', mat: M.cape, len: -3, flare: 5 });                                   // 焦黑长披风，长到小腿
    const armB = { side: 'B', sleeve: 'bell', mat: M.scaleD, cuff: M.gold, hand: skD, grip: P.two ? 'none' : 'fist' };
    if (!P.tf) parts.arm(E, R, P, armB);
    parts.legs(E, R, P, { style: 'boot', mat: M.boot, matD: M.bootD, boot: M.boot, bootD: M.bootD });
    const tor = parts.torso(E, R, P, { style: 'robe', mat: M.robe, trim: M.sash, belt: M.gold, buckle: M.gold, flare: 3 });
    for (let y = tor.y0 + 1; y < tor.hem; y += 2) { const L = tor.rows[0][y - tor.y0], Rr = tor.rows[1][y - tor.y0]; for (let x = L + 1 + ((y >> 1) & 1); x < Rr - 1; x += 3) px(E, R, x, y, M.robe, 2); }   // 鳞甲纹：隔行错开
    const e = parts.edges(R, R.yS + 5);
    turtleShell(E, R, e[0], R.yS + 5, 4, 5.5, { mat: M.shell, ridge: M.flame, fl: P.fl });                        // 焰壳：壳脊一排火
    sash(E, R, M.sash, M.gold);                                                                                   // 金边红绶带：胸前交叉
    if (P.tf) parts.arm(E, R, P, armB);                                                                           // 抚鱼的手托在身前
    parts.head(E, R, P, { mat: sk, face: 'long', eye: eye || sk, eyeStyle: eye ? 'glow' : 'dot', nose: 'long', mouth: 'line', ear: 'none', shade: 3 });
    fireCrown(E, R, P, { mat: M.crown, flame: M.flame, cf: P.cf, fl: P.fl });
    if (P.wpn) { greatGlaive(E, R, P, { wood: M.scale, metal: M.steel, gold: M.gold, flame: M.flame, len: GG.len, back: GG.back }); if (P.two) parts.hand(E, R, P, { side: 'B', hand: skD }); }
    parts.arm(E, R, P, { sleeve: 'bell', mat: M.scale, cuff: M.gold, hand: sk });
    for (let k = 0; k < P.fishN; k++) { const f = fishPos(R, k); if (f[3] >= 0) flameFish(E, R, f[0], f[1], f[2], M.fish); }  // 身前那半圈的火鱼
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let liftT = 9, fleeT = 9, wAng = -99, wFall = 0, chargeAcc = 0, emberAcc = 0, lastStep = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const W_BUTT = [6, 0];                                              // 死亡：钩镰柄尾点地的位置（本地坐标），倒下时绕它往身后转
  function glaiveAt(a) {                                              // 把单独的钩镰画进 wsp（角度变了才重画）
    if (a === wAng) return; wAng = a; const dx = Math.sin(a), dy = -Math.cos(a);
    E.begin(wsp, 0, 0); greatGlaive(E, null, { fl: 0, glint: 0 }, { free: 1, at: [W_BUTT[0] + dx * GG.back, W_BUTT[1] + dy * GG.back], a, wood: M.scale, metal: M.steel, gold: M.gold, flame: M.flame, len: GG.len, back: GG.back });
    bake(wsp, WB);
  }
  function blitW(fade) { const X0 = HX + P.mx - wsp.ox, Y0 = HY - wsp.oy; for (let y = 0; y < wsp.h; y++) for (let x = 0; x < wsp.w; x++) { const c = wsp.out[y * wsp.w + x]; if (c === 255 || (fade && hash(x, y) < fade)) continue; put(X0 + x, Y0 + y, c); } }
  const FISH_FX = [[0, 0, 0], [-1, 0, 1], [-2, 0, 1], [-3, 0, 2], [-1, 1, 2], [-2, -1, 1], [-4, -1, 3], [-4, 1, 3]];
  function fxFish(x, y, dir, fade) { for (const [dx, dy, c] of FISH_FX) { const X = RD(x + dx * dir), Y = RD(y + dy); if (fade && hash(X * 7 + dx, Y) < fade) continue; put(X, Y, EL[c]); } }
  function onEnter(s) {
    if (s === CHARGE) for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832, r = 12 + Math.random() * 6; spawn(K_SPIRAL, wx(P.gx), wy(P.gy), (r - 3.5) / (0.5 + Math.random() * 0.4), 0, 9, R_EL, a, r, 5 + Math.random() * 2); }
    if (s === CAST) {                                                  // 全身爆燃：十字星芒、头顶金焰光柱冲天、粒子外爆
      const cx = wx(P.gx), cy = wy(P.gy);
      releaseOrbit(50, 120, 0.3, 0.7); burst(cx, cy, 24, 60, 140, 0.3, 0.7, R_EL, 12); fx.cross(cx, cy, 6, R_EL, 0.3);
      fx.pillar(wx(1), 0, HY - 36, 1, R_EL, 0.4, 0); ring(cx, cy, 0, R_EL);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_LIFT) {                                // 上挑：130° 弧（从身后下方撩到身前上方），刃口甩出 3 颗火星
      liftT = 0; const cx = wx(K_LIFT.hx + 3), cy = wy(K_LIFT.hy);
      fx.slash(cx, cy, 20, 3.5, 1.2, R_EL, 0.2, 2, 2);
      for (let i = 0; i < 3; i++) spawn(K_BURST, DUMMY_X - 2, HY - 24 - i * 2, 20 + i * 18, -60 - i * 15, 0.45, R_EL);
      hitDummy(0, 1); burst(DUMMY_X - 2, HY - 18, 12, 40, 110, 0.15, 0.4, R_IMP, 16); fx.cross(DUMMY_X - 2, HY - 18, 4, R_EL, 0.2);
      sfx('swing', { kind: 'slash', w: 0.8 }); sfx('hit', { mat: 'flesh', w: 0.7 });
    }
    for (let i = 0; i < 3; i++) if (s === CHARGE && t === SWALLOW[i]) {  // 吞下一条：胸口一亮
      const cx = wx(P.gx), cy = wy(P.gy); burst(cx, cy, 8, 20, 50, 0.2, 0.4, R_EL, 6); fx.cross(cx, cy, 3 + i, R_EL, 0.2);
    }
    if (s === CAST && t === T_PLUNGE) {                                // 钩镰插地：金焰地浪沿地面推向假人
      const x = wx(K_PLUNGE.hx + 4);
      fx.wave(x, HY, 1, DUMMY_X + 4 - x, 7, R_EL, 0.4, 2); fx.crack(x, HY + 1, 8, 1, R_EL, 0.5);
      burst(x, HY - 2, 12, 30, 80, 0.2, 0.45, R_EL, 20); for (let i = 0; i < 6; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 30, -10 - Math.random() * 10, 0.4, FXI.dust);
      shake(0.1, 1);
    }
    if (s === CAST && t === T_WHIT) {                                  // 地浪推到假人：点燃、外爆 30 颗、大冲击环
      dummyFx({ dur: 1.4, tint: 'fire' }); hitDummy(1, 1); burst(DUMMY_X, HY - 14, 30, 50, 140, 0.3, 0.7, R_EL, 20); ring(DUMMY_X, HY - 14, 1, R_EL);
      shake(0.12, 1); sfx('impact', { pal: 'fire', w: 0.8 });
    }
    if (s === DEATH && Math.abs(t - INCOMING) < 1e-9) fleeT = 0;
    if (s === DEATH && Math.abs(t - T_ASH) < 1e-9) {                   // 化灰：先画好「没有钩镰」的最后一帧，交给死亡套件；钩镰单独立着
      poseAt(DEATH, T_ASH - 1 / 12, T_ASH - 1 / 12); P.wpn = 0; drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('ash', { ramp: R_EL }); wAng = -99; wFall = 1;
    }
    if (s === DEATH && Math.abs(t - T_CLANG) < 1e-9) {                 // 「当」：钩镰倒地
      for (let i = 0; i < 10; i++) spawn(K_DUST, wx(-14 + Math.random() * 18), HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust);
      burst(wx(-18), HY - 3, 8, 30, 70, 0.15, 0.35, R_EL, 12); shake(0.1, 1); sfx('fall', { w: 0.8 });
    }
  }
  const EVENTS = [[], [], [T_LIFT], SWALLOW, [T_PLUNGE, T_WHIT], [], [], [INCOMING, T_ASH, T_CLANG], []];
  function hurtFx(s) {                                                 // 鳞甲火花 + 帝焰火星
    const hx = HX + 1, hy = HY - 16; burst(hx, hy, s === DEATH ? 22 : 14, 50, 130, 0.25, 0.55, R_IMP, 20); burst(hx, hy, s === DEATH ? 10 : 6, 30, 90, 0.3, 0.6, R_EL, 12);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE) { chargeAcc += dt * (8 + 16 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 11 + Math.random() * 8; spawn(K_SPIRAL, wx(P.gx), wy(P.gy), (r - 3.5) / (0.4 + Math.random() * 0.3), 0, 9, R_EL, a, r, 6); } }
    if (state === IDLE || state === RECOVER || state === ATTACK) { emberAcc += dt * (state === RECOVER ? 8 : 2.5); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, wx(1 + (Math.random() - 0.5) * 2), wy(-32 - P.cf), (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.5 + Math.random() * 0.4, R_EL); } }   // 冠焰飘出的火星
    if (state === MOVE && P.step !== lastStep) {                       // 帝王缓步：每个脚印留 1 格金焰余烬，0.3 s 走完色阶
      if (P.step !== 0) { sfx('step', { w: 0.8 }); const fx0 = wx(P.step > 0 ? 3 : -3); spawn(K_STILL, fx0, HY, 0, 0, 0.3, R_EL); spawn(K_STILL, fx0 + 1, HY, 0, 0, 0.25, R_EL); spawn(K_DUST, fx0, HY, (Math.random() - 0.5) * 12, -4, 0.3, FXI.dust); }
      lastStep = P.step;
    }
    liftT += dt; fleeT += dt;
  }
  function fxReset() { liftT = 9; fleeT = 9; wAng = -99; wFall = 0; chargeAcc = 0; emberAcc = 0; lastStep = 0; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    const st = E.state, stT = E.stT;
    if (st === DEATH && fleeT < 0.7) for (let k = 0; k < 3; k++) {    // 火鱼四散逃开、消失
      const a = -HALF + (k - 1) * 1.0, r = 12 * (k === 1 ? 0.2 : 1) + fleeT * 55, x = wx(0) + Math.cos(a) * r * (k === 1 ? 0.3 : 1), y = wy(-15) + Math.sin(a) * r * 0.8;
      fxFish(x, y, Math.cos(a) >= 0 ? 1 : -1, clamp01((fleeT - 0.35) / 0.35));
    }
    if (st === DEATH && wFall && stT < DUR[DEATH] - 1e-6) {            // 化灰时钩镰还立着，最后往身后「当」地倒下，再抖动消散
      const q = clamp01((stT - T_TOPPLE) / (T_CLANG - T_TOPPLE)), a = 0.1 - (0.1 + HALF) * ease.in(q);
      glaiveAt(RD(a / ASTEP) * ASTEP); blitW(clamp01((stT - T_CLANG - 0.2) / 0.3));
    }
  }

  return {
    name: '炎帝', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eye, M.flame, M.fish], HIT_POINT: [2, -16], EVENTS,
    deathKit: { mode: 'ash', at: T_ASH }, REVIVE: { ramp: R_EL, big: 1 },
    SFX: { body: 'armor', how: 'dissolve', pal: 'fire', style: 'fire', w: 0.8 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
