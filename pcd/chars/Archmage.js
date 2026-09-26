// 大法师（部队 · 不死 · 法师 · 神话 · 远程 1020）：冰雪法师升级后的同一个骷髅法师——毛领、冰棱冠、三叉杖、骷髅瘦脸都在，每样更华丽：
// 冰棱冠离开头顶，长成 7 根冰锥悬浮成放射冰冕（缓慢自转）；雪狐毛领更大，背后一件银白冰川长披风张开成钟形；
// 三叉杖升级成三叉冰晶权杖（叉更长、叉口嵌一颗大冰晶），原来叉尖的三颗冰晶离开杖身绕身体公转（和冰冕反方向转）；
// 身体悬空 4 格、没有脚，袍摆收成倒冰锥；眼窝魂火是冰紫色，胸前一枚冰紫宝石领扣。待机盘膝冥想（袍摆收起）。
// 攻击 = 「部落战争」：单手举杖一点，三颗环绕冰晶依次离轨，沿弧线追踪飞向目标，每颗命中炸出一圈小回声环（「回声打击」）；
// 技能 = 「超级鼓舞」+「回声打击」：升高、冰晶收成杖顶小环 → 炸成冰紫大冲击环，两侧浮现两个冰紫回声剪影（动作晚 2 帧），
//        本体和回声三束光束齐射，回声环错开三次扩散，回声抖动消散，身上冒冰紫十字（回血）。
// 死亡 = 空袍坠地：魂火熄灭、身体先消失，空法袍和披风瘪下来飘落成一堆；冰冕失去悬浮掉下来碎成冰屑；三颗冰晶落地熄灭。
PCD.define('Archmage', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, keyer, fxRamp, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_TRAIL, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, fall, hitDummy, put, blitShape, scrX, floorGlow, shotFloorGlow, groundShadow, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2, TAU = Math.PI * 2, px = parts.px, FREE = parts.FREE;
  const quad = (a) => ((RD(a / HALF) % 4) + 4) % 4;
  const rotUV = (q, u, v) => (q === 0 ? [u, v] : q === 1 ? [-v, u] : q === 2 ? [-u, -v] : [v, -u]);

  // ───── 元素：回声 · 冰紫极光（21 白 → #d8f4ff 冰白 → #9ab8ff 冰紫蓝 → 24 紫 → 25 深紫）：没有青，偏冰紫 ─────
  const R_EL = fxRamp('echo', [21, '#d8f4ff', '#9ab8ff', 24, 25]), EL = FXR[R_EL];

  // ───── 材质 ─────
  const CAPE = ['#2a3444', '#6a7a92', '#aebad0', '#eef4fa'], ROBE = ['#0a1a36', '#16366a', '#2a5aa0', '#5a8ad0'];
  const M = parts.mats(E, {
    cape: { r: CAPE, band: 2 }, robe: { r: ROBE, band: 2 }, sleeve: ROBE, fur: 'white', face: 'pale', silver: [27, 29, 30, 31],
    hand: ['#0a1a36', '#5a8ad0', '#9ab8ff', '#d8f4ff'],                   // 冻成冰紫蓝的手指
    dia: [25, '#9ab8ff', '#d8f4ff', 21],                                  // 冰冕冰锥
    xtal: { r: [25, 24, '#9ab8ff', '#d8f4ff'], flat: 1 }, xglow: { r: ['#9ab8ff', '#9ab8ff', '#d8f4ff', 21], flat: 1 },   // 冰晶暗档 / 亮档（也是魂火眼）
    ink: { r: 'ink', flat: 1 },
  });
  const BODY = { body: 'slim', sw: 2, leg: 10, torso: 9, head: 7, headW: 6, arm: 10, lw: 2, limb: 0.9, fall: 'back' };
  const HX = 34, DUR = DEFAULT_DUR.slice(), ALT = 4;
  const hero = new Sprite(78, 66, 32, 60);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 16, 22], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['silver', 'xtal', 'xglow', 'face', 'hand', 'dia', 'ink']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  const STAFF = { len: 12, back: 10 };
  const PLAIN = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 };

  // ═════ 候选部件（本模块自带，以后统一收进 parts.js）═════
  // 候选部件：scepter —— 三叉冰晶权杖：银杖身 + 只按 90° 换朝向的长三叉头，叉口嵌一颗大冰晶（和叉头同一个部件，5 档亮度，读 P.gem）。
  //   o = { len 握点到套口, back 握点后杖长, at / a（不传读 P.hx / hy / a）}。T = rig 或 parts.FREE。返回 geo：cell(列, 行) → 坐标，gem 大冰晶中心
  const SC_ROWS = ['....H....', 'H...M...H', 'M...M...M', 'M...M...M', 'M..XXX..M', 'M.XXGXX.M', 'M..XXX..M', '.M..X..M.', '..MMMMM..', '...TtT...'];
  function scGeo(o) {
    const gx = o.at ? o.at[0] : P.hx, gy = o.at ? o.at[1] : P.hy, a = o.a != null ? o.a : P.a, dx = Math.sin(a), dy = -Math.cos(a), q = quad(a);
    const sx = RD(gx + dx * o.len), sy = RD(gy + dy * o.len), cell = (c, r) => { const d = rotUV(q, c - 4, r - 9); return [sx + d[0], sy + d[1]]; };
    return { gx, gy, a, dx, dy, q, sx, sy, bx: gx - dx * o.back, by: gy - dy * o.back, cell, gem: cell(4, 5), tip: cell(4, 0) };
  }
  const GEMT = [[[M.xtal, 4], [M.xtal, 3], [M.xtal, 2], [M.xglow, 3]], [[M.xglow, 3], [M.xtal, 4], [M.xtal, 3], [M.xglow, 4]],
    [[M.xglow, 4], [M.xglow, 3], [M.xtal, 4], [M.xglow, 4]], [[M.xglow, 4], [M.xglow, 4], [M.xglow, 3], [M.xglow, 4]], [[M.xtal, 2], [M.xtal, 1], [M.xtal, 1], [M.xtal, 2]]];
  function scepter(T, o) {
    const G = scGeo(o), lv = Math.max(0, Math.min(4, o.lv != null ? o.lv : P.gem)), L = GEMT[lv];
    E.part(); parts.line(E, T, G.bx, G.by, G.sx, G.sy, M.silver, 3); px(E, T, G.bx, G.by, M.silver, 4);
    { const m = [RD(G.gx - G.dx * 4), RD(G.gy - G.dy * 4)]; px(E, T, m[0], m[1], M.silver, 1); }                 // 握把下的一道箍
    E.part();
    for (let r = 0; r < SC_ROWS.length; r++) for (let c = 0; c < 9; c++) {
      const ch = SC_ROWS[r][c]; if (ch === '.') continue; const p = G.cell(c, r);
      if (ch === 'X') { const v = r - 4, u = c - 4, k = v === 0 || (u < 0 && v === 1) ? 0 : v >= 2 ? 2 : 1; px(E, T, p[0], p[1], L[k][0], L[k][1]); }
      else if (ch === 'G') px(E, T, p[0], p[1], L[3][0], L[3][1]);
      else px(E, T, p[0], p[1], M.silver, ch === 'M' ? 0 : ch === 'H' ? 4 : ch === 'T' ? 3 : 4);
    }
    if (P.glint && !o.at) { const c = G.cell(3, 4); px(E, T, c[0], c[1], M.xglow, 4); }
    return G;
  }
  // 候选部件：floatDiadem —— 悬浮冰冕：n 根冰锥离开头顶 gap 格，在头后排成放射环（屏幕平面内），按 P.dia 转动；冰锥前半 2 格粗、尖端亮。
  //   o = { mat, n, r0 内半径, len [各根长度], phase 相位档, steps 每个冰锥间距分几档, at [cx, cy]（不传 = 头心）}。一个部件。
  const DIA_LEN = [5, 3, 4, 3, 5, 3, 4];
  function floatDiadem(T, cx, cy, o) {
    E.part(); const n = 7, r0 = 6;
    if (o.ring) for (let k = 0; k < 40; k++) { if (k & 1) continue; const a = k / 40 * TAU; px(E, T, cx + Math.sin(a) * (r0 - 1), cy - Math.cos(a) * (r0 - 1), M.dia, 2); }   // 细细的一圈冕环（虚线）
    for (let k = 0; k < n; k++) {
      const a = (P.dia / 4 + k) * TAU / n, ux = Math.sin(a), uy = -Math.cos(a), L = DIA_LEN[k] + (o.grow || 0);
      for (let s = 0; s <= L; s++) { const x = cx + ux * (r0 + s), y = cy + uy * (r0 + s); px(E, T, x, y, M.dia, s === L ? 4 : s === L - 1 ? 3 : 0); if (s < L * 0.45) px(E, T, x + (Math.abs(uy) > Math.abs(ux) ? 1 : 0), y + (Math.abs(uy) > Math.abs(ux) ? 0 : 1), M.dia, 0); }
    }
  }
  // 候选部件：orbCrystal —— 3×4 的菱形小冰晶（发光体，平涂 3 档：0 常亮 · 1 亮 · 2 熄灭）。一个部件。
  const ORB = [[0, -2, 0], [-1, -1, 1], [0, -1, 0], [1, -1, 2], [-1, 0, 1], [0, 0, 2], [1, 0, 3], [0, 1, 3]];
  const ORBT = [[[M.xglow, 3], [M.xtal, 4], [M.xtal, 3], [M.xtal, 2]], [[M.xglow, 4], [M.xglow, 3], [M.xtal, 4], [M.xtal, 3]], [[M.xtal, 3], [M.xtal, 2], [M.xtal, 1], [M.xtal, 1]]];
  function orbCrystal(T, x, y, lv) { E.part(); const L = ORBT[lv]; for (const [u, v, k] of ORB) px(E, T, x + u, y + v, L[k][0], L[k][1]); }
  // 候选部件：bellCape —— 钟形长披风：从后肩垂下，越往下越向后、向前张开（底边比身体宽 8 格以上），下摆一排冰川冰凌齿，两道竖褶。
  //   o = { mat, bot 底边行, back 后张开格数, front 前张开格数 }。读 P.sway / P.bend（后扬）。一个部件。
  function bellCape(R, o) {
    const top = R.yS, bot = o.bot, n = Math.max(1, bot - top), sw = P.sway || 0, bend = P.bend || 0, LL = [], RR = [];
    E.part();
    for (let y = top; y <= bot; y++) {
      const t = (y - top) / n, e = parts.edges(R, Math.max(R.yS, Math.min(R.yHip, y)));
      const L = RD(e[0] - 1 - o.back * Math.pow(t, 1.3) - bend * t * t + sw * t * t), Rr = RD(e[1] + o.front * Math.pow(t, 1.6) + sw * t * t * 0.5);
      parts.run(E, R, y, L, Rr, o.mat, 0); LL.push(L); RR.push(Rr);
      if (t > 0.3 && y < bot) { px(E, R, L + 3, y, o.mat, 2); if (t > 0.55) px(E, R, L + 6, y, o.mat, 2); }
    }
    const L = LL[n], Rr = RR[n], s = RD(sw);
    for (let x = L; x <= Rr; x++) { const k = (((x - s) % 3) + 3) % 3; if (k === 0) { px(E, R, x, bot + 1, o.mat, 3); if ((x & 2) === 0) px(E, R, x, bot + 2, o.mat, 4); } else if (k === 2) px(E, R, x, bot, o.mat, 2); }
    return { L, R: Rr };
  }
  // 雪狐毛大高领（和冰雪法师同一个候选部件 furCollar，这里领子更大）
  function furCollar(R, o) {
    const m = o.mat, cy = R.yS, top = cy - o.up, bot = R.yS + o.drop, xb = R.hx0 - o.back, xf = R.hx1 + o.front, sw = RD(P.sway || 0);
    const ph = (x) => ((((x - sw) % 3) + 3) % 3), LL = [], RR = [];
    E.part();
    for (let y = top; y <= bot; y++) {
      const k = y - top, L = xb + Math.max(0, 2 - k) + (y === bot ? 1 : 0);
      const Rr = y < cy ? (o.noHead ? R.hx0 + 3 - (k === 0 ? 2 : 0) : R.hx0 + 1 - (k === 0 ? 1 : 0)) : Math.min(xf, R.hx1 + 1 + (y - cy) * 2) - (y === bot ? 1 : 0);
      parts.run(E, R, y, L, Rr, m, 0); LL.push(L); RR.push(Rr);
    }
    for (let y = top + 1; y < bot; y += 2) px(E, R, LL[y - top] - 1, y, m, 0);
    px(E, R, xb + 2, top - 1, m, 0); px(E, R, xb + 4, top - 1, m, 4); px(E, R, xb + 1, top, m, 0);
    for (let y = cy + 1; y < bot; y += 2) px(E, R, RR[y - top] + 1, y, m, 0);
    const L = LL[bot - top], Rr = RR[bot - top];
    for (let x = L; x <= Rr; x++) { const q = ph(x); if (q === 2) { px(E, R, x, bot, m, 2); px(E, R, x, bot - 1, m, 2); continue; } px(E, R, x, bot + 1, m, 0); if (q === 0 && x > L && x < Rr) px(E, R, x, bot + 2, m, 0); }
    for (let y = top + 1; y <= bot - 2; y++) for (let x = LL[y - top] + 2; x < RR[y - top] - 1; x++) { const s = (((x * 2 - y + sw) % 7) + 7) % 7; if (s === 0) px(E, R, x, y, m, 2); }
    for (let y = cy; y <= cy + 2; y++) px(E, R, RR[y - top] - 1, y, m, 2);
  }

  // ───── 姿势 ─────
  const P = { hx: 0, hy: 0, a: 0, ai: 0, hd: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, sway: 0, bend: 0, alt: 0, sit: 0, trail: 0,
    gem: 0, olv: 0, omask: 7, omode: 0, orad: 12, orb: 0, dia: 0, dgrow: 0, dfall: 0, cfall: 0, sdrop: 0, hvan: 0, pile: 0,
    eye: 0, eyes: 0, rim: 0, flash: 0, glint: 0, dq: 0, dqk: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, step: 0, wup: 0, walk: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, lean, head) => ({ hx, hy, a, lean: lean || 0, head: head || 0 });
  const K_IDLE = K(7, -11, 0.05);                  // 盘膝：前手扶权杖
  const K_FLOAT = K(7, -13, 0.14);
  const K_WIND = K(6, -15, -0.25, -1);
  const K_POINT = K(10, -17, 0.8, 1);              // 单手举杖一点
  const K_CHARGE = K(6, -21, 0, -1, -1);           // 举杖过头，冰晶收在杖顶
  const K_CAST = K(10, -19, 0.55, 1);
  const K_HURT = K(5, -12, -0.3, -1, -1);
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head'];
  const setK = (A, B, q) => E.mix(P, A, B, q || 0, FIELDS);
  const KEY = keyer([['hx', -10, 30], ['hy', -34, 4], ['ai', -24, 24], ['bhx', -12, 20], ['bhy', -30, 4], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 3], ['bx', -4, 4],
    ['sway', -2, 2], ['bend', 0, 3], ['alt', 0, 10], ['sit', 0, 1], ['trail', -3, 0], ['gem', 0, 4], ['olv', 0, 2], ['omask', 0, 7], ['omode', 0, 1], ['orad', 3, 12], ['orb', 0, 23],
    ['dia', 0, 27], ['dgrow', 0, 2], ['dfall', 0, 3], ['cfall', 0, 4], ['sdrop', 0, 2], ['hvan', 0, 2], ['pile', 0, 3], ['eye', 0, 4], ['eyes', 0, 1], ['rim', 0, 3],
    ['flash', 0, 1], ['glint', 0, 1], ['dqk', 0, 48], ['st', 0, 8]]);
  const ECHO_DY = 3, T_A = [2 / 12, 4 / 12, 6 / 12], T_BEAM = 2 / 12, T_RING2 = 5 / 12, T_RING3 = 2 / 12, T_DIA = INCOMING + 0.45, T_LAND = INCOMING + 0.75;
  const ALT_W = [5, 6, 5, 4], SWAY_W = [-1, -2, -1, -1], TRAIL_W = [-2, -3, -3, -2], BEND_W = [1, 2, 2, 1];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.crouch = 0; P.bob = 0; P.sway = 0; P.bend = 0; P.alt = ALT; P.sit = 0; P.trail = -1; P.gem = 0; P.olv = 0; P.omask = 7; P.omode = 0; P.orad = 12;
    P.orb = Math.floor(tq / 0.3 + 1e-6) % 24; P.dia = Math.floor(tq / 0.6 + 1e-6) % 28; P.dgrow = 0; P.dfall = 0; P.cfall = 0; P.sdrop = 0; P.hvan = 0; P.pile = 0;
    P.eye = 0; P.eyes = 0; P.rim = 1; P.flash = 0; P.glint = 0; P.dq = 0; P.flip = 0; P.mx = 0; P.hd = 0;
    const idle = () => {                                                        // 悬浮冥想：盘膝、上下飘，冰冕和冰晶反方向慢转，偶尔闭眼
      setK(K_IDLE, K_IDLE); P.sit = 1; P.crouch = 3; const b = Math.floor(TT * 2.5 + 1e-6); P.alt = ALT + [0, 1, 2, 1][b & 3]; P.sway = [0, 1, 0, -1][Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) P.eyes = 1; if (lp >= 0.7 && lp < 0.8) P.glint = 1;
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                     // 漂浮：不落地，平移飘行，袍摆后拖
      setK(K_FLOAT, K_FLOAT); const f = E.gait(tq); P.alt = ALT_W[f]; P.sway = SWAY_W[f]; P.trail = TRAIL_W[f]; P.bend = BEND_W[f]; P.a += (f & 1) * 0.1;
      const w = E.walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      const f = Math.floor(tq * 12 + 1e-6); P.alt = ALT + 1;
      if (f < 2) { setK(K_FLOAT, K_WIND, ease.out(clamp01((tq + 1 / 12) / 0.17))); P.gem = 1; P.bend = 1; }
      else if (f < 7) { setK(K_POINT, K_POINT); if (f > 2) P.hx -= 1; P.gem = f === 2 ? 3 : 2; P.rim = 2; P.sway = -1; P.bend = 2; P.omask = f < 4 ? 6 : f < 6 ? 4 : 0; }
      else { setK(K_POINT, K_FLOAT, ease.inOut(clamp01((tq - 7 / 12) / (2 / 12)))); P.omask = 7; P.olv = 1; P.gem = 1; }
    } else if (st === CHARGE) {                                                 // 升高 3 格；三颗冰晶加速公转、收成杖顶小环；冰冕转快
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_FLOAT, K_CHARGE, q); P.alt = ALT + 1 + RD(q * 3); P.rim = 2; P.bend = RD(q * 2); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
      P.omode = 1; P.orad = RD(12 - 8 * clamp01(tq / 0.9)); const w = 2 + 14 * clamp01(tq / 1.2); P.orb = Math.floor(tq * 12 * w / 6 + 1e-6) % 24; P.olv = tq > 0.9 ? 1 : 0;
      P.dia = Math.floor(tq * 12 / (tq < 0.6 ? 2 : 1) + 1e-6) % 28; P.dgrow = tq > 0.9 ? 1 : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.eye = tq > 0.7 ? 1 : 0;
    } else if (st === CAST) {
      setK(K_CAST, K_CAST); P.alt = ALT + 4; P.rim = 3; P.gem = 3; P.omask = 0; P.bend = 3; P.sway = -1; P.eye = 1; P.dgrow = 2; P.dia = Math.floor(tq * 12 + 1e-6) % 28;
      if (tq < 1 / 12) { P.hx += 1; P.lean = 2; }
    } else if (st === RECOVER) {                                                // 三颗冰晶重新入轨，降回原来的高度
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_FLOAT, q); P.alt = ALT + 4 - RD(q * 4); P.rim = q < 0.5 ? 2 : 1; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.bend = RD(2 * (1 - q));
      P.omask = tq < 0.25 ? 0 : tq < 0.33 ? 1 : tq < 0.42 ? 3 : 7; P.olv = tq < 0.55 ? 1 : 0; P.orad = 12; P.eye = tq < 0.3 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT); P.bx = -2; P.eyes = 1; P.sway = 2; P.bend = 0; P.alt = ALT - 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_FLOAT, 0.5); P.bx = -1; P.eyes = 1; P.sway = 1; P.rim = 0; }
      else setK(K_HURT, K_FLOAT, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                                  // 空袍坠地
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else {
        setK(K_HURT, K_HURT); P.bx = -2; P.alt = ALT - 1; P.sway = 2; P.orb = 0; P.dia = 0;
        if (d < 0.2) { P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 1; P.eye = (f12 & 1) ? 1 : 4; }
        else { P.eye = 4; P.hvan = d < 0.3 ? 1 : 2; P.sdrop = d < 0.35 ? 1 : 2; P.omask = 0; P.cfall = Math.min(4, 1 + Math.floor((d - 0.2) / 0.08 + 1e-6)); P.dfall = d < 0.3 ? 1 : d < T_DIA - INCOMING ? 2 : 3; P.gem = 4; }
        if (d >= 0.3) { P.crouch = 2; P.alt = 2; P.lean = -1; P.bend = 2; }
        if (d >= 0.45) { P.crouch = 3; P.alt = 1; P.bend = 3; P.sway = 1; P.pile = 1; }
        if (d >= 0.6) P.pile = 2;
        if (d >= T_LAND - INCOMING) P.pile = 3;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy); P.ai = RD(P.a / ASTEP); P.a = P.ai * ASTEP; P.lean = RD(P.lean); P.head = RD(P.head);
    const R = parts.rig(P, BODY);
    if (P.sit) { P.bhx = 3; P.bhy = R.yHip - 1; } else { P.bhx = -3; P.bhy = R.yS + 9; }
    if (P.sdrop) { P.gx = 6 + P.bx; P.gy = -4; }
    else { const G = scGeo(STAFF); P.gx = G.gem[0] + P.bx; P.gy = G.gem[1] - P.alt; }
    P.dqk = RD(P.dq * 48); KEY(P);
  }

  // ───── 画（部件从后往前）─────
  function orbPos(R, G, k) {                                                   // 第 k 颗环绕冰晶（rig 坐标）和它在前半圈还是后半圈
    const a = -P.orb * TAU / 24 + k * TAU / 3, s = Math.sin(a);
    if (P.omode) return [RD(G.gem[0] + Math.cos(a) * P.orad), RD(G.gem[1] + s * P.orad * 0.5), s > 0];
    return [RD(R.hx - 1 + Math.cos(a) * 12), RD(R.yWaist + 1 + s * 3), s > 0];
  }
  const GROUND_ORB = [[-12, -2], [3, -2], [14, -2]];
  function drawOrbs(R, G, front) {
    if (P.cfall) {                                                            // 死亡：三颗冰晶掉到地上熄灭（不跟身体走）
      if (!front) return; const q = Math.min(1, P.cfall / 3);
      for (let k = 0; k < 3; k++) { const s = [RD(R.hx - 1 + Math.cos(k * TAU / 3) * 12), R.yWaist + 1 - ALT], e = GROUND_ORB[k]; orbCrystal(FREE, RD(s[0] + (e[0] - s[0]) * q), RD(s[1] + (e[1] - s[1]) * q * q), P.cfall >= 3 ? 2 : 0); }
      return;
    }
    for (let k = 0; k < 3; k++) { if (!(P.omask & (1 << k))) continue; const p = orbPos(R, G, k); if (p[2] === front) orbCrystal(R, p[0], p[1], P.olv); }
  }
  function drawPile() {                                                        // 空袍叠成一堆：披风铺开、法袍压在上面、毛领在最上、领扣熄灭
    E.part(); for (const [y, a, b] of [[0, -14, 12], [-1, -13, 11], [-2, -12, 10], [-3, -10, 8], [-4, -8, 5], [-5, -6, 2]]) parts.run(E, FREE, y, a, b, M.cape, 0);
    for (let x = -13; x <= 11; x += 3) px(E, FREE, x, 0, M.cape, 2); px(E, FREE, -15, 0, M.cape, 0); px(E, FREE, 13, 0, M.cape, 4);
    for (const [x, y] of [[-9, -2], [-5, -4], [4, -3], [7, -1]]) px(E, FREE, x, y, M.cape, 2);                // 披风叠起的褶
    E.part(); for (const [y, a, b] of [[-1, -5, 8], [-2, -6, 7], [-3, -6, 6], [-4, -5, 5], [-5, -3, 3]]) parts.run(E, FREE, y, a, b, M.robe, 0);
    px(E, FREE, 9, -1, M.robe, 0); px(E, FREE, 9, 0, M.robe, 0); px(E, FREE, 10, 0, M.robe, 4); px(E, FREE, -2, -4, M.robe, 2); px(E, FREE, 2, -2, M.robe, 2); px(E, FREE, 5, -3, M.robe, 2);
    E.part(); for (const [y, a, b] of [[-5, -8, -3], [-6, -9, -2], [-7, -8, -3], [-6, 1, 3], [-7, 1, 2]]) parts.run(E, FREE, y, a, b, M.fur, 0);   // 毛领瘪成一圈，前后两撮
    px(E, FREE, -10, -5, M.fur, 0); px(E, FREE, -6, -8, M.fur, 4); px(E, FREE, -4, -8, M.fur, 0); px(E, FREE, -1, -5, M.fur, 2);
    E.part(); px(E, FREE, 4, -5, M.xtal, 2); px(E, FREE, 5, -5, M.xtal, 1); px(E, FREE, 4, -4, M.xtal, 1);
  }
  let echoPass = 0;
  function drawHero(spr) {
    E.begin(spr || hero, P.bx, 0);
    const R = parts.rig(P, BODY); R.oy = -P.alt;
    const G = scGeo(STAFF);
    if (P.pile >= 3) { drawPile(); }
    else {
      if (!P.dfall) floatDiadem(R, R.hx - 1, R.hy - 3, { grow: P.dgrow, ring: 1 });
      drawOrbs(R, G, false);
      bellCape(R, { mat: M.cape, bot: -2, back: 8, front: 5 });
      parts.arm(E, R, P, { side: 'B', at: [P.bhx, P.bhy], sleeve: 'bell', mat: M.sleeveD, cuff: M.furD, cuffStyle: 'fur', grip: 'none' });
      const tor = parts.torso(E, R, P, { style: 'robe', mat: M.robe, trim: M.dia, hem: P.sit ? R.yHip : R.yHip + 2, flare: P.sit ? 0 : 1 });
      { const I = (y) => Math.max(0, Math.min(tor.rows[0].length - 1, y - tor.y0)), hem = tor.hem, L = tor.rows[0][I(hem)], Rr = tor.rows[1][I(hem)];   // 袍摆（同一个部件）
        parts.run(E, R, hem, L, Rr, M.robe, 0);
        if (P.sit) {                                                         // 盘膝：膝盖往前顶出一块，下面垂一小截冰锥尖
          const y0 = R.yHip, kx = parts.edges(R, y0)[1];
          for (const [dy, a, b] of [[-1, 0, 2], [0, 0, 4], [1, 0, 5], [2, 1, 5], [3, 2, 4]]) parts.run(E, R, y0 + dy, L + a, kx + b, M.robe, 0);
          px(E, R, kx + 4, y0, M.robe, 4); parts.run(E, R, y0 + 2, kx - 1, kx + 2, M.robe, 2);
          parts.run(E, R, y0 + 4, L + 2, L + 5, M.robe, 0); parts.run(E, R, y0 + 5, L + 3, L + 4, M.robe, 0); px(E, R, L + 3, y0 + 6, M.robe, 4);
        } else {                                                             // 袍摆收成倒冰锥，尖端随 P.trail 后拖
          const tipX = -1 + P.trail, n = -hem;
          for (let y = hem + 1; y <= 0; y++) { const f = Math.pow((y - hem) / n, 0.85), a = RD(L + (tipX - L) * f), b = RD(Rr + (tipX - Rr) * f); parts.run(E, R, y, a, Math.max(a, b), M.robe, y === 0 ? 4 : 0); }
          for (let y = hem + 1; y < -1; y++) { const f = (y - hem) / n; px(E, R, RD(((L + Rr) / 2 + 1) * (1 - f) + tipX * f), y, M.robe, 2); }
        } }
      if (P.hvan < 2) {
        const H = parts.head(E, R, P, { mat: P.hvan ? M.faceD : M.face, face: 'gaunt', nose: 'none', mouth: 'none', ear: 'none' });
        if (!P.hvan) {                                                       // 骷髅脸（更瘦：颧下两格凹陷）+ 冰紫魂火
          const ex = H.eye[0], ey = H.ey, x1 = H.x1;
          px(E, R, ex - 2, ey - 1, M.face, 3); px(E, R, ex - 1, ey - 1, M.face, 3); px(E, R, ex, ey - 1, M.face, 2); px(E, R, x1, ey - 1, M.face, 4); px(E, R, x1, ey, M.face, 2);
          px(E, R, ex - 1, ey + 1, M.face, 2); px(E, R, ex - 1, ey + 2, M.face, 2); px(E, R, x1, ey + 1, M.ink, 0); px(E, R, x1 - 1, ey + 1, M.face, 4);
          px(E, R, x1, ey + 2, M.face, 4); px(E, R, x1 - 1, ey + 2, M.ink, 0);
          const e = P.eyes ? 5 : P.eye;
          if (e === 5 || e === 4) { px(E, R, ex, ey, M.xtal, e === 4 ? 2 : 1); px(E, R, ex - 1, ey, M.xtal, 1); }
          else if (e === 0) { px(E, R, ex, ey, M.xtal, 4); px(E, R, ex - 1, ey, M.xtal, 3); }
          else { px(E, R, ex, ey, M.xglow, 4); px(E, R, ex - 1, ey, M.xglow, 3); px(E, R, ex, ey - 1, M.xtal, 3); }
        }
      }
      parts.arm(E, R, P, { side: 'F', sleeve: 'bell', mat: M.sleeve, cuff: M.fur, cuffStyle: 'fur', grip: 'none' });
      if (P.sit && !P.hvan) parts.hand(E, R, P, { side: 'B', hand: M.handD });
      furCollar(R, { mat: M.fur, back: 6, front: 5, up: 2, drop: 4, noHead: P.hvan >= 2 });
      E.part(); { const x = R.hx1 + 2, y = R.yS + 3, lv = P.gem >= 4 ? 2 : P.gem >= 2 ? 1 : 0, L = ORBT[lv];   // 冰紫宝石领扣（发光体）
        px(E, R, x, y, L[0][0], L[0][1]); px(E, R, x + 1, y, L[1][0], L[1][1]); px(E, R, x, y + 1, L[2][0], L[2][1]); px(E, R, x + 1, y + 1, L[3][0], L[3][1]); }
      if (!P.sdrop) { scepter(R, STAFF); if (!P.hvan) parts.hand(E, R, P, { side: 'F', hand: M.hand }); }
      drawOrbs(R, G, true);
    }
    if (P.sdrop === 1) scepter(FREE, { ...STAFF, at: [8, -9], a: 1.0, lv: 4 });           // 权杖脱手：斜着往下掉
    else if (P.sdrop === 2) scepter(FREE, { ...STAFF, at: [8, -3], a: HALF, lv: 4 });     // 横在地上（杖头在那堆袍子前面）
    if (P.dfall === 1 || P.dfall === 2) floatDiadem(FREE, -3, P.dfall === 1 ? -22 : -14, { grow: 0 });   // 冰冕失去悬浮往下掉
    if (P.pile >= 3) drawOrbs(R, G, true);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 回声剪影：本体 2 帧前的样子（施放 → 往前推到蓄力末尾），烤进单独的精灵，画成冰紫单色 ─────
  const echoSpr = new Sprite(hero.w, hero.h, hero.ox, hero.oy); let echoKey = -1;
  function echoUpdate() {
    let s = E.state, t = E.stT - 2 / 12;
    if (s === CAST && t < 0) { s = CHARGE; t += DUR[CHARGE]; } else if (s === RECOVER && t < 0) { s = CAST; t += DUR[CAST]; }
    const key = s * 1000 + f12of(t); if (key === echoKey) return;
    poseAt(s, t, E.simT); drawHero(echoSpr); bake(echoSpr, PLAIN); poseAt(E.state, E.stT, E.simT); echoKey = key;
  }

  // ───── 特效 ─────
  const hc = [0, 1, 2].map(() => ({ on: 0, t: 0, x0: 0, y0: 0, cx: 0, cy: 0, x1: 0, y1: 0 }));   // 攻击时离轨追踪的三颗冰晶
  const HC_DUR = 0.24;
  let castT = 9, chargeAcc = 0, emberAcc = 0, trailAcc = 0, healAcc = 0, soulAcc = 0, deadT = -1;
  const scr = (x, y) => [scrX(x + P.bx), HY + y];
  function launch(k) {
    const R = parts.rig(P, BODY), G = scGeo(STAFF), p = orbPos(R, G, k), s = scr(p[0], p[1] - P.alt), H = hc[k];
    H.on = 1; H.t = 0; H.x0 = s[0]; H.y0 = s[1]; H.x1 = DUMMY_X - 2; H.y1 = HY - 22 + k * 6; H.cx = (H.x0 + H.x1) / 2 - 6; H.cy = Math.min(H.y0, H.y1) - 18 + k * 4;
    burst(s[0], s[1], 5, 20, 50, 0.12, 0.25, R_EL, 0); sfx('shoot', { proj: 'orb' });
  }
  const hcPos = (H) => { const q = clamp01(H.t / HC_DUR), a = (1 - q) * (1 - q), b = 2 * q * (1 - q), c = q * q; return [a * H.x0 + b * H.cx + c * H.x1, a * H.y0 + b * H.cy + c * H.y1]; };
  function healCross(x, y) { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) spawnX(K_PHYS, x + dx, y + dy, 0, -15, 0.75, R_EL, { g: 0 }); }
  function onEnter(s) {
    if (s === CHARGE) fx.circle(scrX(0), HY, 15, 3, R_EL, DUR[CHARGE] + 0.35, 1, 0);   // 身下冰紫法阵
    if (s === CAST) {
      poseAt(CAST, 0, 0); castT = 0; echoKey = -1; const g = scr(P.gx - P.bx, P.gy);
      releaseOrbit(50, 120, 0.3, 0.7); burst(g[0], g[1], 28, 60, 140, 0.3, 0.7, R_EL, 10); ring(g[0], g[1], 1, R_EL); fx.cross(g[0], g[1], 8, R_EL, 0.3);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK) { const i = T_A.indexOf(t); if (i >= 0) { if (i === 0) sfx('swing', { kind: 'staff', w: 0.25 }); launch(i); } }
    if (s === CAST && t === T_BEAM) {                                            // 本体 + 两个回声同时三束齐射
      const g = scr(P.gx - P.bx, P.gy);
      for (let k = -1; k <= 1; k++) fx.beam(g[0] + k * 8, g[1] - k * ECHO_DY, DUMMY_X, HY - 16 - k * 8, 2, R_EL, 0.5, 2);   // 三束平行错开（回声上下错开 3 格）
      fx.cross(DUMMY_X, HY - 16, 6, R_EL, 0.25); burst(DUMMY_X, HY - 16, 30, 60, 140, 0.3, 0.6, R_EL, 12);
      ring(DUMMY_X, HY - 16, 0, R_EL); hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'arcane', w: 0.8 });
    }
    if ((s === CAST && t === T_RING2) || (s === RECOVER && t === T_RING3)) { ring(DUMMY_X, HY - 16, 0, R_EL); burst(DUMMY_X, HY - 16, 8, 30, 70, 0.2, 0.4, R_EL, 6); hitDummy(0); sfx('impact', { pal: 'arcane', w: 0.45 }); }   // 回声环错开 3 帧依次扩散
    if (s === DEATH && t === T_DIA) {                                           // 冰冕砸在地上碎成冰屑
      const x = scrX(-3 + P.bx), y = HY - 3;
      burst(x, y, 16, 30, 90, 0.25, 0.55, R_EL, 22); for (let i = 0; i < 6; i++) fall(x - 6 + i * 2, y - 4 - Math.random() * 4, (Math.random() - 0.5) * 30, -30 - Math.random() * 20, HY, R_EL, 1);
    }
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 14 + Math.random() * 28, HY - 1, (Math.random() - 0.5) * 30, -5 - Math.random() * 8, 0.35 + Math.random() * 0.35, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.35 }); deadT = 0; }
  }
  const EVENTS = [[], [], T_A, [], [T_BEAM, T_RING2], [T_RING3], [], [T_DIA, T_LAND], []];
  function hurtFx(s) {
    const hx = HX + HIT_POINT[0] - 1, hy = HY + HIT_POINT[1];
    burst(hx, hy, s === DEATH ? 16 : 10, 50, 120, 0.25, 0.5, FXI.dust, 18); burst(hx, hy, s === DEATH ? 10 : 6, 40, 100, 0.2, 0.5, R_EL, 14);   // 骨灰 + 冰紫魂光
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    const g = scr(P.gx - P.bx, P.gy);
    for (const H of hc) if (H.on) {
      H.t += dt; const p = hcPos(H);
      spawn(K_TRAIL, p[0], p[1] + (Math.random() - 0.5), (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, 0.18 + Math.random() * 0.1, R_EL);
      if (H.t >= HC_DUR) { H.on = 0; burst(H.x1, H.y1, 8, 30, 80, 0.15, 0.35, R_EL, 8); ring(H.x1, H.y1, 0, R_EL); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.3 }); }   // 小回声环
    }
    if (state === CHARGE) { chargeAcc += dt * (16 + 22 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 8, a = Math.random() * TAU; spawn(K_SPIRAL, g[0], g[1], (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, -(5 + Math.random() * 3)); } }
    if (state === MOVE || state === IDLE) {                                      // 身下拖 1–2 颗冰紫粒子
      trailAcc += dt * (state === MOVE ? 9 : 2.5);
      while (trailAcc >= 1) { trailAcc -= 1; const x = scrX((P.sit ? 0 : -1 + P.trail) + P.bx), y = HY - P.alt + (P.sit ? -4 : 1); spawn(K_RISE, x + (Math.random() - 0.5) * 2, y, (P.flip ? 1 : -1) * (state === MOVE ? 8 : 0) + (Math.random() - 0.5) * 4, 6 + Math.random() * 6, 0.35 + Math.random() * 0.25, R_EL); }
    }
    if ((state === IDLE || state === RECOVER) && P.dq < 1) { emberAcc += dt * (state === IDLE ? 1.5 : 6); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, g[0] + RD(Math.random() * 2 - 1), g[1] - 1, Math.random() * 8 - 4, -6 - Math.random() * 8, 0.6 + Math.random() * 0.6, R_EL); } }
    if (castT < 2) {
      castT += dt;
      if (castT > T_BEAM && castT < 0.75) { healAcc += dt * 8; while (healAcc >= 1) { healAcc -= 1; healCross(scrX(-6 + Math.random() * 10 + P.bx), HY - P.alt - 8 - Math.random() * 12); } }
    }
    if (deadT >= 0) { deadT += dt; if (deadT > 0.85 && deadT < 1.65) { soulAcc += dt * 22; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 22, HY - 2 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.7, R_EL); } } }
  }
  function fxReset() { castT = 9; chargeAcc = 0; emberAcc = 0; trailAcc = 0; healAcc = 0; soulAcc = 0; deadT = -1; echoKey = -1; for (const H of hc) H.on = 0; }
  function fxBack(f12) {
    if (P.pile < 3 && P.dq < 1) groundShadow(scrX(-1 + P.bx), 8, P.alt);        // 地面影子（跟着走，越高越窄）
    if (!P.sdrop && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12); shotFloorGlow(f12);
    if (castT < 0.65 && (E.state === CAST || E.state === RECOVER)) {           // 两侧的冰紫回声剪影：浮现 → 齐射 → 命中后抖动消散
      echoUpdate(); const hit = castT > T_BEAM + 0.05, dq = castT < 0.1 ? 1 - castT / 0.1 : clamp01((castT - T_BEAM - 0.2) / 0.25), j = hit ? ((f12 & 1) ? 1 : -1) : 0;
      blitShape(echoSpr, HX + P.mx - 8 + j, HY + ECHO_DY, P.flip, EL[3], dq); blitShape(echoSpr, HX + P.mx + 8 - j, HY - ECHO_DY, P.flip, EL[2], dq);   // 后面的低一点、前面的高一点
    }
  }
  function fxFront(f12) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (P.gem >= 2 && P.gem <= 3 && !P.sdrop && P.dq < 1) { const L = P.gem === 3 ? 6 : 3 + (f12 & 1); for (let r = 3; r <= L; r++) { const c = P.gem === 3 ? (r <= 3 ? EL[0] : r <= 5 ? EL[1] : EL[2]) : (r === 3 ? EL[1] : EL[2]); put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); } }
    for (const H of hc) if (H.on) {                                            // 追踪冰晶：菱形 + 白芯
      const p = hcPos(H), x = RD(p[0]), y = RD(p[1]);
      put(x, y - 2, EL[1]); put(x - 1, y - 1, EL[1]); put(x, y - 1, EL[0]); put(x + 1, y - 1, EL[2]); put(x - 1, y, EL[2]); put(x, y, EL[1]); put(x + 1, y, EL[3]); put(x, y + 1, EL[3]);
    }
  }

  const HIT_POINT = [0, -18];
  return {
    name: '大法师', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.xtal, M.xglow], HIT_POINT, EVENTS,
    SFX: { body: 'ghost', how: 'collapse', pal: 'arcane', style: 'beam', w: 0.55, hover: 1 },
    REVIVE: { dy: -18, ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, hurtFx, stepFX, fxReset, fxBack, fxFront,
  };
});
