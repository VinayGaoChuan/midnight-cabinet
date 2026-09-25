// 冰雪法师（部队 · 不死 · 法师 · 稀有 · 远程 680）：怕冷的骷髅冰法师。身体极瘦、长袍到脚（袍摆结一排小冰凌），
// 肩上一圈竖起的雪狐毛大高领把上半身撑成倒三角（领子盖住下巴和半个后脑），脑后 5 根冰锥放射成冰棱冠；
// 青灰骷髅瘦脸、眼窝两点冰蓝魂火、手指冻成冰蓝；手持白桦木三叉冰杖（银箍、三个叉尖各嵌一颗冰晶 = 连打三下）。
// 攻击 = 特性「部落战争」：双手把三叉杖指向前方，三个叉尖依次各射一根冰针（间隔 2 帧），三颗冰晶依次闪；
// 技能 = 特性「超级鼓舞」：蓄满法力后冰焰狂怒——身后炸开锯齿冰焰光环，接一轮加速连射（9 根、间隔 1 帧），最后一根冻住目标，边打边回血。
// 死亡 = 冻裂：从脚往上结冰，定格后「喀啦」碎成冰块（死亡套件 chunks），三叉杖断成两截。
// 升级成「大法师」（Archmage.js）：同一个骷髅——冰棱冠离开头顶成悬浮冰冕、毛领更大、三颗冰晶离开杖身绕身公转、脚离地漂浮。
PCD.define('IceAndSnowMage', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, keyer, hash, B8, PAL,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_STILL, K_PHYS, K_SPIRAL,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fall, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, death, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2, px = parts.px;
  const quad = (a) => ((RD(a / HALF) % 4) + 4) % 4;
  const rotUV = (q, u, v) => (q === 0 ? [u, v] : q === 1 ? [-v, u] : q === 2 ? [-u, -v] : [v, -u]);
  function bres(x0, y0, x1, y1, cb) {
    x0 = RD(x0); y0 = RD(y0); x1 = RD(x1); y1 = RD(y1);
    const ax = Math.abs(x1 - x0), ay = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = ax + ay;
    for (let n = 0; n < 200; n++) { cb(x0, y0, n); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= ay) { e += ay; x0 += sx; } if (e2 <= ax) { e += ax; y0 += sy; } }
  }

  // ───── 元素：超级鼓舞 · 霜怒（FXI.frost：21 白 → 22 青 → 23 蓝 → 40 → 39 深蓝）─────
  const R_EL = FXI.frost, EL = FXR[R_EL];

  // ───── 材质 ─────
  const ROBE = ['#0e2238', '#1e4a70', '#3a7eac', '#7ab8dc'];
  const M = parts.mats(E, {
    robe: { r: ROBE, band: 2 }, sleeve: ROBE, fur: 'white', face: 'pale',
    birch: ['#3a3228', '#8a8070', '#c8c0ac', '#eeeade'], silver: [27, 29, 30, 31],
    ice: ['#1e4a70', '#7ab8dc', '#c4ecf8', 21],                          // 冰棱冠、袍摆冰凌
    hand: ['#1e4a70', '#3a7eac', '#7ab8dc', '#c4ecf8'],                  // 冻成冰蓝的手指
    boot: ['#0e2238', 39, 40, 41], ink: { r: 'ink', flat: 1 },
    xtal: { r: [39, 40, 23, 22], flat: 1 }, xglow: { r: [22, 22, 21, 21], flat: 1 },   // 叉尖冰晶：暗档 / 亮档
    eye: { r: [39, 23, 22, 21], flat: 1 },                                // 眼窝魂火
  });
  const BODY = { body: 'slim', sw: 2, leg: 10, torso: 8, head: 6, headW: 5, arm: 9, lw: 2, stride: 2, lift: 1, limb: 0.9, neck: -1 };
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(68, 48, 30, 43);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['birch', 'silver', 'xtal', 'xglow', 'eye', 'face', 'hand', 'ice', 'ink', 'boot']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  const STAFF = { len: 12, back: 11 };

  // ═════ 候选部件（本模块自带，以后统一收进 parts.js）═════
  // 候选部件：tridentStaff —— 三叉杖：直杖身（白桦木：浅色树皮 + 暗色皮孔 + 银箍）+ 只按 90° 换朝向的三叉头，三个叉尖各嵌一颗冰晶
  //   （冰晶嵌在叉里，和叉头同一个部件；两格高，5 档亮度）。叉与叉之间留 3 格缝，剪影里也看得出三叉。
  //   o = { len 握点到套口, back 握点后杖长, lv [3 个叉尖的档 0 待机 · 1 蓄力 · 2 蓄满 · 3 闪 · 4 熄灭], at / a（不传就读 P.hx / hy / a）,
  //         half 0 整根 | 1 只画上半截（brk 到叉头）| 2 只画下半截（杖尾到 brk），brk 断口离握点的格数 }。T = rig 或 parts.FREE。
  //   返回 triGeo：{ sx, sy 套口, tips: 3 个叉尖冰晶（精灵本地坐标）}
  const TRI_ROWS = ['....C....', 'C...C...C', 'C...M...C', 'M...M...M', 'Mm..M..mM', '.MMMMMMM.', '...TtT...'];
  function triGeo(o) {
    const gx = o.at ? o.at[0] : P.hx, gy = o.at ? o.at[1] : P.hy, a = o.a != null ? o.a : P.a, dx = Math.sin(a), dy = -Math.cos(a), q = quad(a);
    const sx = RD(gx + dx * o.len), sy = RD(gy + dy * o.len);
    const cell = (c, r) => { const d = rotUV(q, c - 4, r - 6); return [sx + d[0], sy + d[1]]; };
    return { gx, gy, a, dx, dy, q, sx, sy, bx: gx - dx * o.back, by: gy - dy * o.back, cell, tips: [cell(0, 1), cell(4, 0), cell(8, 1)] };
  }
  const XT = [[M.xtal, 4, M.xtal, 3], [M.xglow, 3, M.xtal, 3], [M.xglow, 3, M.xtal, 4], [M.xglow, 4, M.xglow, 3], [M.xtal, 2, M.xtal, 1]];
  function tridentStaff(T, o) {
    const G = triGeo(o), lv = o.lv || [0, 0, 0], h = o.half || 0, brk = o.brk || 0;
    const kx = G.gx + G.dx * brk, ky = G.gy + G.dy * brk;
    E.part();
    const shaft = (x0, y0, x1, y1, ferrule) => bres(x0, y0, x1, y1, (x, y, n) => {
      if (ferrule && n === 0) { px(E, T, x, y, M.silver, 3); return; }
      px(E, T, x, y, M.birch, (n % 7) === 3 ? 1 : (n % 4) === 1 ? 2 : 3);
    });
    if (h === 0) { shaft(G.bx, G.by, G.sx, G.sy, 1); const m = [RD(G.gx - G.dx * 5), RD(G.gy - G.dy * 5)]; px(E, T, m[0], m[1], M.silver, 4); }
    else if (h === 1) shaft(kx, ky, G.sx, G.sy, 0);
    else { shaft(G.bx, G.by, kx, ky, 1); }
    if (h === 2) return G;
    E.part();
    for (let r = 0; r < TRI_ROWS.length; r++) for (let c = 0; c < 9; c++) {
      const ch = TRI_ROWS[r][c]; if (ch === '.') continue; const p = G.cell(c, r);
      if (ch === 'C') { const k = c < 4 ? 0 : c === 4 ? 1 : 2, top = (k === 1 ? r === 0 : r === 1), L = XT[lv[k]]; px(E, T, p[0], p[1], top ? L[0] : L[2], top ? L[1] : L[3]); }
      else px(E, T, p[0], p[1], M.silver, ch === 'M' ? 0 : ch === 'm' ? 2 : ch === 'T' ? 3 : 4);
    }
    if (P.glint && !h) { const d = rotUV(G.q, 0, -1), c = G.tips[1]; px(E, T, c[0] + d[0], c[1] + d[1], M.xglow, 4); }
    return G;
  }
  // 候选部件：iceCrown —— 脑后放射的冰棱冠：几根冰锥从头后向上放射（根部藏在头和毛领后面），前半段 2 格粗、尖端 1 格亮。
  //   spikes = [[根 x, 根 y, 尖 x, 尖 y]]（相对头中线 hx / 下巴行 hy）；读 P.crown（> 0 每根加长格数；-1 = 第 2、4 根断掉一截）。一个部件。
  const SPK = [[-4, -2, -9, -5], [-3, -3, -7, -8], [-2, -3, -4, -9], [-1, -4, -1, -8], [0, -4, 1, -7]];
  function iceCrown(R, m) {
    E.part(); const g = Math.max(0, P.crown);
    for (let i = 0; i < SPK.length; i++) {
      const [bx, by, tx, ty] = SPK[i], L0 = Math.hypot(tx - bx, ty - by), ux = (tx - bx) / L0, uy = (ty - by) / L0;
      const L = L0 + g - (P.crown < 0 && (i === 1 || i === 3) ? 3 : 0), n = Math.ceil(L), side = Math.abs(ux) > Math.abs(uy) ? [0, 1] : [1, 0];
      for (let k = 0; k <= n; k++) {
        const x = R.hx + bx + ux * k * (L / n), y = R.hy + by + uy * k * (L / n);
        px(E, R, x, y, m, k === n ? 4 : 0); if (k / n < 0.55) px(E, R, x + side[0], y + side[1], m, 0);
      }
    }
  }
  // 候选部件：furCollar —— 竖起的雪狐毛大高领：后高前低，后沿盖住半个后脑，前沿从下巴行开始向前斜伸，左右伸出肩外；
  //   后沿 / 前沿每隔一行一撮毛尖、上沿两撮（改外轮廓），下摆毛穗长短相间（长 2 格 · 短 1 格 · 缝），束间的缝用色阶第 2 级。
  //   o = { mat, back 后沿比头后沿多几格, front 前沿比头前沿多几格, up 后沿高出下巴几行, drop 下沿在肩线下几行, lift 整体上移（缩肩）, clasp 领扣材质 }
  //   读 P.sway（毛穗相位）。一个部件。
  function furCollar(R, o) {
    const m = o.mat, lift = o.lift || 0, cy = R.hy - lift, top = cy - o.up, bot = R.yS + o.drop - lift, xb = R.hx0 - o.back, xf = R.hx1 + o.front, sw = RD(P.sway || 0);
    const ph = (x) => ((((x - sw) % 3) + 3) % 3), LL = [], RR = [];
    E.part();
    for (let y = top; y <= bot; y++) {
      const k = y - top, L = xb + Math.max(0, 2 - k) + (y === bot ? 1 : 0);
      const Rr = y < cy ? R.hx0 + 1 - (k === 0 ? 1 : 0) : Math.min(xf, R.hx1 + 1 + (y - cy) * 2) - (y === bot ? 1 : 0);
      parts.run(E, R, y, L, Rr, m, 0); LL.push(L); RR.push(Rr);
    }
    for (let y = top + 1; y < bot; y += 2) px(E, R, LL[y - top] - 1, y, m, 0);
    px(E, R, xb + 2, top - 1, m, 0); px(E, R, xb + 4, top - 1, m, 4);
    for (let y = cy + 1; y < bot; y += 2) px(E, R, RR[y - top] + 1, y, m, 0);
    const L = LL[bot - top], Rr = RR[bot - top];
    for (let x = L; x <= Rr; x++) { const q = ph(x); if (q === 2) { px(E, R, x, bot, m, 2); px(E, R, x, bot - 1, m, 2); continue; } px(E, R, x, bot + 1, m, 0); if (q === 0 && x > L && x < Rr) px(E, R, x, bot + 2, m, 0); }
    for (let y = cy - 1; y <= cy + 1; y++) px(E, R, xb + 3 + (y & 1), y, m, 2);
    if (o.clasp) { const x = R.hx1 + 2, y = cy + 3; px(E, R, x, y, o.clasp, 4); px(E, R, x + 1, y, o.clasp, 3); px(E, R, x, y + 1, o.clasp, 2); }
    return { top, bot, back: xb };
  }

  // ───── 姿势 ─────
  const P = { hx: 0, hy: 0, a: 0, ai: 0, hd: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    c0: 0, c1: 0, c2: 0, eye: 0, eyes: 0, crown: 0, rim: 0, flash: 0, frz: 0, glint: 0, breath: 0, shrug: 0, dq: 0, dqk: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, hd, lean, head) => ({ hx, hy, a, hd, lean: lean || 0, head: head || 0 });
  const K_IDLE = K(7, -11, 0.06, 0);
  const K_WALK = K(7, -12, 0.16, 0);
  const K_WIND = K(6, -14, 0.9, -5, -1);          // 攻击预兆：抬杖前倾，后手搭上杖身
  const K_POINT = K(9, -13, HALF, -6, 1);         // 双手平端三叉杖指向前方
  const K_CHARGE = K(7, -12, 0, 5, 0, -1);        // 双手握紧三叉杖竖在身前（后手在上）
  const K_CAST = K(10, -14, HALF, -6, 1, 1);
  const K_HURT = K(5, -10, -0.3, 0, -1, -1);
  const K_FROZEN = K(6, -10, -0.12, 0, 1, 1);     // 冻住时的姿势：缩着、低头
  const FIELDS = ['hx', 'hy', 'a', 'hd', 'lean', 'head'];
  const setK = (A, B, q) => E.mix(P, A, B, q || 0, FIELDS);
  const KEY = keyer([['hx', -10, 30], ['hy', -30, 2], ['ai', -24, 24], ['hd', -8, 8], ['bhx', -10, 30], ['bhy', -30, 2], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 3], ['bob', 0, 1], ['bx', -4, 4],
    ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['c0', 0, 4], ['c1', 0, 4], ['c2', 0, 4], ['eye', 0, 4], ['eyes', 0, 1], ['crown', -1, 3], ['rim', 0, 3],
    ['flash', 0, 1], ['frz', 0, 48], ['glint', 0, 1], ['breath', 0, 2], ['shrug', 0, 1], ['dqk', 0, 48], ['st', 0, 8]]);
  const SWAY_IDLE = [0, 1, 0, -1];
  const T_A = [2 / 12, 4 / 12, 6 / 12], T_PUFF = 1.75, T_SHATTER = INCOMING + 0.85, T_LAND = T_SHATTER + 0.25, T_BREAK = 0.36;
  const T_CAST = [1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12], T_REC = [0.5 / 12, 1.5 / 12, 2.5 / 12, 3.5 / 12];
  const lit = (k, v) => { if (k === 0) P.c0 = v; else if (k === 1) P.c1 = v; else P.c2 = v; };

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.crouch = 0; P.bob = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.c0 = P.c1 = P.c2 = 0;
    P.eye = 0; P.eyes = 0; P.crown = 0; P.rim = 1; P.flash = 0; P.frz = 0; P.glint = 0; P.breath = 0; P.shrug = 0; P.dq = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 0.8 && lp < 0.9) P.glint = 1;                                  // 冰晶偶尔一闪
      if (lp >= 1.5 && lp < 2.0) {                                              // 待机个性：呵手取暖——后手凑到嘴边呵一口白霜，缩一下肩
        const f = Math.floor((lp - 1.5) * 12 + 1e-6); P.breath = f === 0 || f === 5 ? 1 : 2; P.shrug = f >= 4 ? 1 : 0; P.eyes = f === 3 ? 1 : 0;
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                     // 裹袍碎步：小步、上身不晃，袍摆扫地
      setK(K_WALK, K_WALK); const f = E.gait(tq); parts.gait(P, f); P.beard = 0;
      P.a += P.step * 0.06; P.hx += P.step * 0.5;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                 // 部落战争：三个叉尖依次各射一针
      const f = Math.floor(tq * 12 + 1e-6); P.c0 = P.c1 = P.c2 = 1;
      if (f < 2) { setK(K_IDLE, K_WIND, ease.out(clamp01((tq + 1 / 12) / 0.17))); P.sway = 1; }
      else if (f < 7) { setK(K_POINT, K_POINT); const k = (f - 2) >> 1, fire = ((f - 2) & 1) === 0; if (!fire) P.hx -= 1; lit(k, fire ? 3 : 2); P.rim = 2; P.sway = -1; P.lean = fire ? 1 : 0; }
      else { setK(K_POINT, K_IDLE, ease.inOut(clamp01((tq - 7 / 12) / (2 / 12)))); P.c2 = 2; }
    } else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q); P.rim = 2; P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
      const on = (t0) => (tq < t0 ? 0 : tq < t0 + 0.1 ? 1 : 2);                 // 三颗冰晶依次亮起
      P.c0 = on(0.2); P.c1 = on(0.45); P.c2 = on(0.7);
      if (tq >= 0.95) { const v = (f12 & 1) ? 3 : 2; P.c0 = P.c1 = P.c2 = v; }
      P.eye = tq < 0.3 ? 0 : tq < 0.7 ? 1 : ((f12 & 1) ? 3 : 2);                // 魂火变大，拖出冰焰尾
      P.crown = tq < 0.5 ? 0 : Math.min(3, Math.floor((tq - 0.5) * 12 + 1e-6) + 1);   // 冰锥每帧长 1 格
      P.bend = RD(q * 2);
    } else if (st === CAST) {
      const f = Math.floor(tq * 12 + 1e-6); setK(K_CAST, K_CAST); P.rim = 3; P.eye = (f12 & 1) ? 3 : 2; P.crown = 3; P.sway = -1;
      if (f === 0) { P.c0 = P.c1 = P.c2 = 3; P.lean = 2; }
      else { P.c0 = P.c1 = P.c2 = 2; lit((f - 1) % 3, 3); if (f & 1) P.hx -= 1; }
    } else if (st === RECOVER) {
      const f = Math.floor(tq * 12 + 1e-6);
      if (tq < 0.33) { setK(K_CAST, K_CAST); P.c0 = P.c1 = P.c2 = 2; lit((5 + f) % 3, 3); if (!(f & 1)) P.hx -= 1; P.rim = 2; P.sway = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.33) / 0.33)); setK(K_CAST, K_IDLE, q); const v = q < 0.5 ? 1 : 0; P.c0 = P.c1 = P.c2 = v; P.rim = q < 0.5 ? 2 : 1; }
      P.eye = tq < 0.3 ? 2 : tq < 0.45 ? 1 : 0; P.crown = tq < T_BREAK ? 3 : -1;   // 冰焰眼尾缩回，两根冰锥碎落
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT); P.bx = -2; P.eyes = 1; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.sway = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                                   // 冻裂：从脚往上结冰 → 定格 → 碎成冰块
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.2) { setK(K_HURT, K_HURT); P.bx = -2; P.eyes = 1; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.1 ? 0 : 1; }
      else if (d < T_SHATTER - INCOMING) {
        setK(K_FROZEN, K_FROZEN); P.bx = -2; P.crouch = 1; P.eye = d < 0.45 ? 4 : 4; P.eyes = 0; P.c0 = P.c1 = P.c2 = 4;
        P.frz = Math.min(48, RD(clamp01((d - 0.2) / 0.35) * 40)); if (d >= 0.6) P.glint = (f12 % 3) === 0 ? 1 : 0;
      } else { setK(K_FROZEN, K_FROZEN); P.bx = -2; P.crouch = 1; P.dq = 1; P.frz = 40; }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.breath = 0; P.shrug = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      if (tq > 0.85) P.c0 = P.c1 = P.c2 = 2;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.ai = RD(P.a / ASTEP); P.a = P.ai * ASTEP; P.hd = RD(P.hd); P.lean = RD(P.lean); P.head = RD(P.head);
    if (P.hd) { const dx = Math.sin(P.a), dy = -Math.cos(P.a); P.bhx = RD(P.hx + dx * P.hd); P.bhy = RD(P.hy + dy * P.hd); }
    else if (P.breath) { P.bhx = P.breath === 2 ? 4 : 5; P.bhy = (P.breath === 2 ? -19 : -15) + yo; }
    else { P.bhx = -3; P.bhy = -9 + yo; }
    const G = triGeo(STAFF); P.gx = G.tips[1][0] + P.bx; P.gy = G.tips[1][1];
    P.dqk = RD(P.dq * 48); KEY(P);
  }

  // ───── 画（部件从后往前）─────
  let loot = 1;                                                              // 0 = 冻裂快照：不画杖（杖另外断成两截）
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY);
    iceCrown(R, M.ice);
    parts.arm(E, R, P, { side: 'B', at: P.breath ? [-2, R.yS + 6] : [P.bhx, P.bhy], sleeve: 'bell', mat: M.sleeveD, cuff: M.furD, cuffStyle: 'fur', grip: 'none' });
    parts.legs(E, R, P, { style: 'shoe', mat: M.robeD, matD: M.robeD, boot: M.boot, bootD: M.bootD });
    const tor = parts.torso(E, R, P, { style: 'robe', mat: M.robe, trim: M.ice, flare: 2 });
    { const hem = tor.hem, L = tor.rows[0][hem - tor.y0], Rr = tor.rows[1][hem - tor.y0], sw = RD(P.sway);   // 袍摆冰凌（同一个部件）
      for (let x = L + 1; x < Rr; x++) { const k = (((x - sw) % 4) + 4) % 4; if (k === 2) px(E, R, x, hem + 1, M.ice, (x & 4) ? 4 : 3); else if (k === 1) px(E, R, x, hem, M.ice, 3); } }
    const H = parts.head(E, R, P, { mat: M.face, face: 'gaunt', nose: 'none', mouth: 'none', ear: 'none' });
    { const ex = H.eye[0], ey = H.ey, x1 = H.x1;                                 // 骷髅脸：颧下凹陷、鼻腔、牙排、眼窝魂火（和脸同一个部件）
      px(E, R, ex - 1, ey + 1, M.face, 2); px(E, R, x1, ey + 1, M.ink, 0); px(E, R, x1 - 1, ey + 1, M.face, 4);
      px(E, R, x1, ey + 2, M.face, 4); px(E, R, x1 - 1, ey + 2, M.ink, 0); px(E, R, x1 - 2, ey + 2, M.face, 4);
      const e = P.eyes ? 5 : P.eye;
      if (e === 5) { px(E, R, ex, ey, M.eye, 1); px(E, R, ex - 1, ey, M.eye, 1); }
      else if (e === 4) { px(E, R, ex, ey, M.xtal, 2); px(E, R, ex - 1, ey, M.eye, 1); }
      else if (e === 0) { px(E, R, ex, ey, M.eye, 3); px(E, R, ex - 1, ey, M.eye, 2); }
      else { px(E, R, ex, ey, M.eye, 4); px(E, R, ex - 1, ey, M.eye, 3); if (e >= 2) px(E, R, ex, ey - 1, M.eye, 3); } }
    parts.arm(E, R, P, { side: 'F', sleeve: 'bell', mat: M.sleeve, cuff: M.fur, cuffStyle: 'fur', grip: 'none' });
    furCollar(R, { mat: M.fur, back: 5, front: 4, up: 3, drop: 4, lift: P.shrug, clasp: M.silver });
    if (P.breath) {                                                          // 呵手：后手越过身前凑到嘴边（压在毛领前面）
      E.part(); parts.sweep(E, R, 5, R.yS + 3, P.bhx + 1, P.bhy + 2, 1, 1.2, M.sleeveD, 0);
      E.part(); parts.brush(E, R, P.bhx + 1, P.bhy + 2, 0.9, M.furD, 0);
      E.part(); parts.rect(E, R, P.bhx - 1, P.bhy - 1, 2, 2, M.handD, 0); px(E, R, P.bhx - 1, P.bhy - 1, M.handD, 4);
    }
    if (loot) tridentStaff(R, { ...STAFF, lv: [P.c0, P.c1, P.c2] });
    if (P.hd) parts.hand(E, R, P, { side: 'B', hand: M.handD });
    parts.hand(E, R, P, { side: 'F', hand: M.hand });
    if (!P.eyes && P.eye >= 2 && P.eye <= 3) {                                // 冰焰眼尾（发光体，最后画）
      E.part(); const ex = H.eye[0], ey = H.ey, long = P.eye === 3;
      px(E, R, ex - 1, ey - 1, M.eye, 3); px(E, R, ex - 2, ey - 2, M.eye, 2); px(E, R, ex - 3, ey - 2, M.xtal, 2);
      if (long) { px(E, R, ex - 3, ey - 3, M.eye, 2); px(E, R, ex - 4, ey - 4, M.xtal, 2); }
    }
  }
  // 冻住：精灵自下而上按亮度映射成冰色，勾线换成青色冰边，结冰前沿一行白
  let FRZ = null;
  function frzMap() {
    if (FRZ) return FRZ; FRZ = new Uint8Array(256);
    for (let i = 0; i < 256; i++) { if (i >= PAL.length) { FRZ[i] = i; continue; } const n = parseInt(PAL[i].slice(1), 16), l = (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; FRZ[i] = l > 0.72 ? 21 : l > 0.48 ? 22 : l > 0.28 ? 23 : l > 0.14 ? 40 : 39; }
    return FRZ;
  }
  function freezeOut(s, frz, glint) {
    if (!frz) return; const map = frzMap(), w = s.w, cut = s.oy - frz;
    for (let y = Math.max(0, cut); y < s.h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, c = s.out[i]; if (c === 255) continue;
      s.out[i] = !s.mat[i] ? 22 : y === cut ? 21 : (glint && hash(x, y) < 0.05) ? 21 : map[c];
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); freezeOut(hero, P.frz, P.glint); }

  // ───── 断成两截的三叉杖（碎裂时烤成 4 张：上半截倾倒 / 落地、下半截倾倒 / 落地）─────
  const PLAIN = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 };
  const halves = [0, 1, 2, 3].map(() => new Sprite(hero.w, hero.h, hero.ox, hero.oy));
  function bakeHalves() {
    const G = triGeo(STAFF), BR = 3, kx = RD(G.gx + G.dx * BR + P.bx), ky = RD(G.gy + G.dy * BR);
    const one = (i, o) => { E.begin(halves[i], 0, 0); tridentStaff(parts.FREE, { ...STAFF, lv: [4, 4, 4], ...o }); bake(halves[i], PLAIN); freezeOut(halves[i], 60, 0); };
    one(0, { half: 1, at: [kx, ky], a: G.a - 0.55, len: STAFF.len - BR, brk: 0 });
    one(1, { half: 1, at: [kx - 4, -5], a: -HALF, len: STAFF.len - BR, brk: 0 });
    one(2, { half: 2, at: [kx, ky], a: G.a + 0.6, len: 1, back: STAFF.back + BR, brk: 0 });
    one(3, { half: 2, at: [kx + 11, -1], a: HALF, len: 1, back: STAFF.back + BR, brk: 0 });
  }
  function blitOut(s, X, Y, dq, dy) { const o = s.out; for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const c = o[y * s.w + x]; if (c === 255 || (dq > 0 && B8[(y & 7) * 8 + (x & 7)] < dq)) continue; put(X - s.ox + x, Y - s.oy + y + dy, c); } }

  // ───── 特效 ─────
  let mzT = 9, mzX = 0, mzY = 0, chT = -1, castT = 9, staffT = -1, emberAcc = 0, chargeAcc = 0, healAcc = 0, soulAcc = 0, wispAcc = 0, lastStep = 0, skillHits = 0;
  const tipScr = (k) => { const G = triGeo(STAFF), t = G.tips[k]; return [scrX(t[0] + P.bx), HY + t[1]]; };
  const NEEDLE = { trail: { every: 2, life: [0.06, 0.12], back: [8, 16], off: 3 }, glow: -1 };
  function fireNeedle(k, big, vx) {
    const p = tipScr(k); shoot(big ? 2 : 1, p[0] + 1, p[1], vx, DUMMY_X - 3, R_EL, 0, NEEDLE);
    mzT = 0; mzX = p[0]; mzY = p[1]; burst(p[0], p[1], 3, 20, 50, 0.1, 0.2, R_EL, 0); sfx('shoot', { proj: 'arrow' });
  }
  function healCross(x, y) { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) spawnX(K_PHYS, x + dx, y + dy, 0, -15, 0.75, R_EL, { g: 0 }); }
  function onEnter(s) {
    if (s === CHARGE) { chT = 0; }
    if (s === CAST) {
      chT = -1; castT = 0; skillHits = 0; const cx = scrX(-1), cy = HY - 15;
      releaseOrbit(40, 90, 0.3, 0.6); burst(cx, cy - 4, 24, 50, 130, 0.3, 0.7, R_EL, 18); ring(cx, cy, 1, R_EL);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK) { const i = T_A.indexOf(t); if (i >= 0) { if (i === 0) sfx('swing', { kind: 'staff', w: 0.25 }); fireNeedle(i, 0, 240); } }
    if (s === CAST) { const n = T_CAST.indexOf(t); if (n >= 0) fireNeedle(n % 3, 0, 300); }
    if (s === RECOVER) {
      const n = T_REC.indexOf(t); if (n >= 0) fireNeedle((5 + n) % 3, n === 3, 300);
      if (t === T_BREAK) {                                                       // 两根冰锥碎落
        const R = parts.rig(P, BODY);
        for (const i of [1, 3]) { const sp = SPK[i], x = scrX(R.hx + sp[2] + P.bx), y = HY + R.hy + sp[3]; for (let j = 0; j < 3; j++) fall(x + j - 1, y + j, (Math.random() - 0.5) * 30, -20 - Math.random() * 20, HY, R_EL, 1); burst(x, y, 5, 20, 50, 0.15, 0.3, R_EL, 6); }
      }
    }
    if (s === IDLE && t === T_PUFF) {                                              // 呵出一小团白霜
      const x = scrX(P.bhx + 2 + P.bx), y = HY + P.bhy - 1;
      for (let i = 0; i < 7; i++) spawnX(K_PHYS, x + Math.random() * 2, y + (Math.random() - 0.5) * 2, 10 + Math.random() * 14, -3 - Math.random() * 6, 0.55 + Math.random() * 0.4, R_EL, { dragX: 0.2, dragY: 0.3 });
    }
    if (s === DEATH && t === T_SHATTER) {                                         // 「喀啦」：冻住的身体碎成冰块，三叉杖断成两截
      poseAt(DEATH, T_SHATTER - 1 / 12, T_SHATTER - 1 / 12); loot = 0; drawHero(); bakeHero(); loot = 1; bakeHalves(); hero.k1 = hero.k2 = -1;
      death.start('chunks', { chunk: 3, power: 0.85, fromX: 0, fromY: -12, fadeAt: 1.1, fadeDur: 0.5 }); staffT = 0;
      burst(scrX(-2), HY - 14, 16, 40, 110, 0.25, 0.55, R_EL, 10); shake(0.14, 1); sfx('impact', { pal: 'frost', w: 0.45 });
    }
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 14 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 26, -5 - Math.random() * 8, 0.35 + Math.random() * 0.35, FXI.dust); sfx('fall', { w: 0.3 }); }
  }
  const EVENTS = [[T_PUFF], [], T_A, [], T_CAST, T_REC.concat([T_BREAK]), [], [T_SHATTER, T_LAND], []];
  function impactOn(k, x, y) {
    burst(x, y, 4, 30, 80, 0.12, 0.3, R_EL, 8); hitDummy(k === 2 ? 1 : 0);        // 每根冰针溅出 4 颗冰屑
    const st = E.state;
    if (st === CAST || st === RECOVER || k === 2) {
      skillHits++;
      if (k === 2) { ring(x, y, 0, R_EL); burst(x, y, 10, 40, 100, 0.2, 0.45, R_EL, 10); dummyFx({ dur: 1.4, outline: 'frost', tint: 'frost', slow: 0.35 }); shake(0.12, 1); sfx('impact', { pal: 'frost', w: 0.7 }); }
      else if (skillHits % 3 === 0) sfx('impact', { pal: 'frost', w: 0.4 });
    } else sfx('hit', { mat: 'magic', w: 0.25 });
  }
  function hurtFx(s) {
    const hx = HX + HIT_POINT[0] - 1, hy = HY + HIT_POINT[1];
    burst(hx, hy, s === DEATH ? 18 : 12, 50, 120, 0.25, 0.5, FXI.dust, 18); burst(hx, hy, s === DEATH ? 8 : 4, 40, 100, 0.2, 0.45, R_EL, 14);   // 骨灰 + 冰屑
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {
      chT += dt; chargeAcc += dt * 10;
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 9 + Math.random() * 6, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if (state === MOVE && P.step !== lastStep) {                                  // 碎步：每个脚印结一格霜
      if (P.step !== 0) { sfx('step', { w: 0.2 }); spawn(K_STILL, scrX(4 + P.bx), HY + 1, 0, 0, 0.3, R_EL); if (Math.random() < 0.5) spawn(K_DUST, scrX(3), HY, (Math.random() - 0.5) * 10, -3, 0.25, FXI.dust); }
      lastStep = P.step;
    }
    if ((state === IDLE || state === RECOVER) && !P.dq) { emberAcc += dt * (state === IDLE ? 2 : 6); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + RD(Math.random() * 2 - 1), gy - 1, Math.random() * 8 - 4, -6 - Math.random() * 8, 0.6 + Math.random() * 0.6, R_EL); } }
    if (castT < 1.0) {
      castT += dt;
      if (castT < 0.85) { healAcc += dt * 7; while (healAcc >= 1) { healAcc -= 1; healCross(scrX(-6 + Math.random() * 10 + P.bx), HY - 8 - Math.random() * 12); } }   // 回血：十字冰晶上升
      wispAcc += dt * 14; while (wispAcc >= 1) { wispAcc -= 1; const x = scrX(-12 + Math.random() * 22), y = HY - 22 - Math.random() * 10; spawn(K_RISE, x, y, (Math.random() - 0.5) * 6, -18 - Math.random() * 12, 0.3 + Math.random() * 0.25, R_EL); }
    } else castT += dt;
    if (staffT >= 0) {
      staffT += dt;
      if (staffT > 0.9 && staffT < 1.6) { soulAcc += dt * 22; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 20, HY - 2 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.7, FXI.soul); } }
    }
    mzT += dt;
  }
  function fxReset() { mzT = 9; chT = -1; castT = 9; staffT = -1; emberAcc = 0; chargeAcc = 0; healAcc = 0; soulAcc = 0; wispAcc = 0; lastStep = 0; skillHits = 0; }
  // 蓄力：脚下寒气螺旋上卷（24 颗，双股，前半圈画在角色前、后半圈画在角色后）
  function helix(front) {
    if (chT < 0) return; const cx = scrX(-1 + P.bx), H = 30, form = clamp01(chT / 0.5), spd = 18 + chT * 16;
    for (let k = 0; k < 24; k++) {
      const h = ((k >> 1) / 12 * H + chT * spd) % H; if (h > H * form + 1) continue;
      const r = 10 - h * 0.17, ang = h * 0.42 + chT * 6 + (k & 1) * Math.PI, s = Math.sin(ang); if ((s > 0) !== front) continue;
      const age = h / H, c = age < 0.2 ? EL[0] : age < 0.45 ? EL[1] : age < 0.72 ? EL[2] : EL[3];
      put(RD(cx + Math.cos(ang) * r), RD(HY - 1 - h + s * 1.5), c);
    }
  }
  // 施放：身后炸开的锯齿冰焰光环（只画外轮廓：外沿亮、内沿暗；上半圈是一排往上翻腾的冰焰舌）
  function aura(f12) {
    if (castT >= 1.1) return;
    const cx = scrX(-1 + P.bx), cy = HY - 15, g = Math.min(1, (castT + 0.02) / 0.12), rx = 7 + 6 * g, ry = 9 + 7 * g, late = castT > 0.55, broken = castT > 0.85;
    const TONG = [6, 3, 1, 3];
    const inside = (x, y) => {
      const dx = (x - cx) / rx; if (dx <= -1 || dx >= 1) return false; const s = Math.sqrt(1 - dx * dx);
      if (y > cy + ry * s * 0.85) return false;
      const k = (x - cx + 64) & 3, t = TONG[k] * (1 - Math.abs(dx) * 0.6) + (((f12 + ((x - cx + 64) >> 2)) & 1) ? 1.5 : 0);
      return y >= cy - ry * s - t;
    };
    for (let y = cy - ry - 9; y <= cy + ry; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      const edge2 = !edge && (!inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y - 2));
      if (!edge && !edge2) continue; if (broken && ((x + y + f12) & 1)) continue; if (late && edge2 && ((x + f12) & 1)) continue;
      const tip = !inside(x, y - 1) && y < cy - ry * 0.4;
      put(x, y, edge ? (castT < 0.1 ? EL[0] : tip ? EL[0] : late ? EL[2] : EL[1]) : (late ? EL[3] : EL[2]));
    }
  }
  function fxBack(f12) { if (P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12); shotFloorGlow(f12); aura(f12); helix(false); }
  function fxFront(f12) {
    helix(true);
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; put(mzX, mzY, EL[0]); for (let r = 1; r <= 2; r++) { put(mzX + r, mzY, c); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } }
    if (P.c1 === 3 && E.state === CHARGE && P.dq < 1) { const gx = scrX(P.gx), gy = HY + P.gy; for (let r = 2; r <= 4; r++) { const c = r < 3 ? EL[0] : EL[1]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); } }
    if (staffT >= 0) {                                                          // 断成两截的杖：倾倒 → 落地弹一下 → 随冰块一起消散
      const dq = clamp01((staffT - 1.1) / 0.5);
      if (staffT < 0.12) { blitOut(halves[0], HX, HY, 0, RD(staffT * 20)); blitOut(halves[2], HX, HY, 0, RD(staffT * 10)); }
      else { const b = staffT < 0.2 ? -1 : 0; blitOut(halves[1], HX, HY, dq, b); blitOut(halves[3], HX, HY, dq, 0); }
    }
  }
  // 冰针：1×3 白芯青尾（最后一根 1×4，头上下各一格蓝）
  function drawShot(k, x, y, d, f12, R) {
    if (k !== 1 && k !== 2) return false;
    put(x, y, EL[0]); put(x - d, y, EL[1]); put(x - 2 * d, y, EL[1]);
    if (k === 2) { put(x + d, y, EL[0]); put(x - 3 * d, y, EL[2]); put(x, y - 1, EL[2]); put(x, y + 1, EL[2]); }
    return true;
  }

  const HIT_POINT = [0, -14];
  return {
    name: '冰雪法师', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.xtal, M.xglow, M.eye], HIT_POINT, EVENTS,
    deathKit: { mode: 'chunks', at: T_SHATTER },
    SFX: { body: 'flesh', how: 'shatter', pal: 'frost', style: 'buff', w: 0.35 },
    REVIVE: { dy: -14, ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, hurtFx, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
