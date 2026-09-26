// 赤十字（部队 · 不死 · 战士 · 稀有）：步卒攒够了魂长成的样子——还是那顶尖锥斗笠（檐上系了朱红布带、带尾往身后飘），龟壳挪到背上当背甲、
// 壳面用血画了一个大红十字，胸前两条朱红带交叉成 X；暗朱红罩衣下露出步卒的稻草蓑衣，肩上搭一卷带铅坠的渔网，腰间鱼篓更大、挂一串赤魂鱼；
// 双手钩镰长刀（前刃、背后铁钩、柄尾红布）。攻击 = 横扫（腰部发力 120° 横弧，钩背顺势回带）；
// 技能 = 特性「商业渔夫」：把渔网抡到头顶转圈，一甩撒网罩住假人，一网拖出三条赤魂鱼飞回背壳，红十字爆亮。
// 升级自「步卒」（FootSoldier.js），升级成「炎帝」（EmperorOfFlame.js）。
PCD.define('RedCross', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, keyer, hash,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_BURST, K_TRAIL, K_EMBER, K_SPIRAL_PT,
    spawn, burst, ring, shake, flash, fx, hitDummy, dummyFx, death, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2, px = parts.px;
  const quad = (a) => ((RD(a / HALF) % 4) + 4) % 4;
  const rotUV = (q, u, v) => (q === 0 ? [u, v] : q === 1 ? [-v, u] : q === 2 ? [-u, -v] : [v, -u]);
  function bres(x0, y0, x1, y1, cb) {
    x0 = RD(x0); y0 = RD(y0); x1 = RD(x1); y1 = RD(y1);
    const ax = Math.abs(x1 - x0), ay = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = ax + ay;
    for (let n = 0; n < 200; n++) { cb(x0, y0, n); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= ay) { e += ay; x0 += sx; } if (e2 <= ax) { e += ax; y0 += sy; } }
  }

  // ───── 元素：赤潮 · 血朱（FXI.blood：21 白 → 58 淡红 → 57 红 → 56 暗红 → 55 墨红）─────
  const R_EL = FXI.blood, EL = FXR[R_EL], R_IMP = FXI.impact, R_ST = FXI.steel;

  // ───── 材质 ─────
  const STRAW = ['#221a0c', '#4e3e1e', '#7e6a38', '#aa965a'], SHELL = ['#141a0c', '#2e3a1a', '#4e5a2a', '#7a8446'], ROBE = ['#2e0a08', '#6e1a12', '#b0301c', '#e0603a'];
  const M = parts.mats(E, {
    robe: { r: ROBE, band: 2 }, sleeve: ROBE, straw: { r: STRAW, band: 1 }, hat: 'sand', skin: 'pale', pants: 'stone', rope: 'wood', basket: 'wood',
    shell: SHELL, blood: 'blood', band: 'blood', steel: 'steel', iron: 'iron', wood: 'wood', cloth: 'crimson', net: [0, 8, 10, 7], lead: 'white', whet: 'stone',
    eyeA: { r: [55, 56, 57, 57], flat: 1 }, eyeB: { r: [55, 57, 58, 21], flat: 1 },                  // 魂火眼：长成了赤色
    crossA: { r: [55, 57, 58, 58], flat: 1 }, crossB: { r: [56, 58, 21, 21], flat: 1 }, crossC: { r: [58, 21, 21, 21], flat: 1 }, crossX: { r: [0, 55, 55, 56], flat: 1 },   // 背壳血十字的三档亮 + 熄灭档（干涸的暗血）
    fish: { r: [55, 56, 57, 58], flat: 1 },                                                             // 篓口 / 鱼绳上的赤魂鱼（发光体）
  });
  const BODY = { body: 'heroic' };
  const R0 = parts.rig({}, BODY);
  const GL = { len: 13, back: 12 };
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(96, 66, 44, 58);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 16], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['skin', 'wood', 'steel', 'iron', 'cloth', 'lead', 'whet', 'eyeA', 'eyeB', 'crossA', 'crossB', 'crossC', 'fish', 'hat', 'band', 'net']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ═════ 候选部件（本模块自带，以后统一收进 parts.js）═════
  // 候选部件：斗笠 bambooHat —— 同步卒；本级加 band 帽带（檐上一行）+ 带尾（tail：两条布带从帽后往身后飘 len 格，随 P.beard 下垂 / 被吹直，尾尖随 sway 摆；单独一个部件，画在最后面）。
  const HAT_ROWS = [[-3, 0, 1], [-2, -1, 2], [-1, -3, 4], [0, -4, 5], [1, -5, 6]];
  function hatT(R, o) { return o.at ? { r0: (o.rot || 0) & 3, tx: RD(o.at[0]), ty: RD(o.at[1]) - 1, rot: 0, ox: 0, oy: 0 } : { r0: 0, tx: R.hx + (o.off || 0), ty: R.htop, rot: R.rot, ox: R.ox, oy: R.oy }; }
  function bambooHat(E, R, P, o) {
    const T = hatT(R, o), m = o.mat;
    E.part();
    for (const [v, a, b] of HAT_ROWS) for (let u = a; u <= b; u++) px(E, T, u, v, v === 0 && o.band ? o.band : m, 0);
    for (let v = -2; v <= -1; v++) { const k = (v + 3) / 4; px(E, T, RD(0.5 - 3.4 * k), v, m, 2); px(E, T, RD(0.5 + 3.6 * k), v, m, 2); }
    px(E, T, 0, -3, m, 4); if (o.band) { px(E, T, -4, 0, o.band, 2); px(E, T, -3, -1, o.band, 3); }   // 帽带在帽后打的结
  }
  function hatTails(E, R, P, o) {
    const T = hatT(R, o), m = o.mat, b = RD(P.beard || 0), sw = RD(P.sway || 0);
    E.part();
    for (let j = 0; j < 2; j++) {
      const L = (o.len || 5) - j + (b < 0 ? 1 : 0), droop = b < 0 ? 0.6 : 2.2 + b * 0.8;
      for (let k = 1; k <= L; k++) { const q = k / L; px(E, T, -4 - k, j + RD(q * q * droop) + (k === L ? sw : 0), m, j ? 2 : (k === L ? 4 : 0)); }
    }
  }
  // 候选部件：龟壳背甲 turtleShell —— 同步卒的龟壳（脊盾横缝、肋盾竖缝、缘盾缝）；本级背在背上，壳面画一个大血十字（cross 材质，2 格粗，和壳同一个部件）。
  function turtleShell(E, R, cx, cy, rx, ry, o) {
    const m = o.mat, X = Math.ceil(rx), Y = Math.ceil(ry), sy = Math.max(1, RD(ry * 0.4));
    E.part();
    for (let j = -Y; j <= Y; j++) for (let i = -X; i <= X; i++) {
      const e = (i * i) / (rx * rx + 0.3) + (j * j) / (ry * ry + 0.3); if (e > 1) continue;
      let t = 0, mm = m;
      if (e > 0.6) t = ((i * 2 + j + 40) % 3 === 0) ? 2 : 0;
      else if (Math.abs(i) <= 1 && (j === -sy || j === sy)) t = 2;
      else if (Math.abs(i) === 2 && Math.abs(j) <= sy + 1) t = 2;
      if (o.cross && e <= 0.78 && ((i >= -1 && i <= 0) || (j >= -1 && j <= 0))) { mm = o.cross; t = o.crossT || 0; }   // 十字：竖横两臂都过壳心
      px(E, R, cx + i, cy + j, mm, t);
    }
  }
  // 候选部件：鱼篓 creel —— 同步卒；本级加 string：篓侧挂一串赤魂鱼（每条 1×3 + 分叉尾，头朝下，随 P.beard 摆）。
  function creel(E, R, P, x0, y0, w, h, o) {
    const m = o.mat;
    E.part();
    for (let j = 0; j < h; j++) { const a = x0 + (j === h - 1 ? 1 : 0), b = x0 + w - 1 - (j === h - 1 ? 1 : 0); for (let x = a; x <= b; x++) px(E, R, x, y0 + j, m, j === 0 ? (x === a ? 4 : 3) : ((((x - x0) >> 1) + (j >> 1)) & 1) ? 2 : 0); }
    if (!o.fish) return;
    E.part(); const f = o.fish, s = o.wag ? 1 : 0;
    px(E, R, x0 + 2, y0 - 1, f, 3); px(E, R, x0 + 1 + s, y0 - 2, f, 4); px(E, R, x0 + 3 + s, y0 - 2, f, 2);
    if (o.string) {                                                    // 鱼绳：从口沿前角垂下，串两条鱼
      E.part(); const sx = x0 + w, b = RD((P.beard || 0) * 0.5);
      px(E, R, sx, y0, o.string, 3); px(E, R, sx, y0 + 1, o.string, 3);
      for (let k = 0; k < 2; k++) { const fx0 = sx + (k ? b : 0), fy = y0 + 2 + k * 4; px(E, R, fx0 - 1, fy, f, 2); px(E, R, fx0 + 1, fy, f, 2); px(E, R, fx0, fy + 1, f, 3); px(E, R, fx0, fy + 2, f, 3); px(E, R, fx0, fy + 3, f, 4); }
    }
  }
  // 候选部件：蓑衣 strawCoat —— 同步卒（稻草纹 + 草穗下摆）；本级只露在罩衣下摆下面当内衬。
  function strawCoat(E, R, P, o) {
    const tor = parts.torso(E, R, P, Object.assign({ style: 'tunic' }, o)), m = o.mat, LL = tor.rows[0], RR = tor.rows[1], y0 = tor.y0, hem = tor.hem, sw = RD(P.sway || 0);
    for (let y = y0 + 2; y < hem; y++) { const L = LL[y - y0], Rr = RR[y - y0]; for (let x = L + 1; x < Rr; x++) if ((((x + y) % 3) + 3) % 3 === 0 && (y & 1)) px(E, R, x, y, m, 2); }
    const L = LL[hem - y0], Rr = RR[hem - y0], n = o.fringe || 2;
    for (let x = L; x <= Rr; x++) { const k = (((x - sw) % 2) + 2) % 2, len = n - k; for (let j = 1; j <= len; j++) px(E, R, x + (j === len ? sw : 0), hem + j, m, j === len ? 2 : 3); }
    return tor;
  }
  // 候选部件：卷起的渔网 netRoll —— 搭在后肩上的一卷网（7×3，网眼亮暗交错），下沿垂着两颗铅坠（白点）；肩线往上鼓 2 格。o = { mat, lead }。一个部件。
  function netRoll(E, R, P, o) {
    const x = R.sBx - 5, y = R.yS - 2, m = o.mat;
    E.part();
    for (let j = 0; j < 3; j++) { const a = x + (j === 1 ? 0 : 1), b = x + (j === 1 ? 7 : 6); for (let i = a; i <= b; i++) px(E, R, i, y + j, m, ((i + j) & 1) ? 2 : 0); }
    px(E, R, x + 2, y, m, 4); px(E, R, x + 1, y + 3, o.lead, 4); px(E, R, x + 5, y + 3, o.lead, 3);
  }
  // 候选部件：钩镰 hookGlaive —— 长柄单刃刀（9×9 头）：刀背直、刃口朝前一列亮边、刃尖往前勾；刃根背后伸出一只往下弯的铁钩（钩尖和柄之间 3 格空）；
  //   只按 90° 换朝向，柄用直线插进套口；柄尾往上 2 格系一截红布（随 P.beard 摆）。o = { wood, metal, iron, cloth, len, back, at, a, free }。部件：柄（+ 红布）→ 头。
  const GLAIVE = ['....HE...', '....MME..', '....MMME.', '....MMME.', '....MMmE.', '....MMmE.', 'IIIIMmE..', 'I...Mm...', 'E...T....'];
  function glaiveGeo(gx, gy, a, len) { const dx = Math.sin(a), dy = -Math.cos(a); return { dx, dy, ax: RD(gx + dx * len), ay: RD(gy + dy * len), q: quad(a) }; }
  function hookGlaive(E, R, P, o) {
    const T = o.free ? parts.FREE : R, g = o.at || [P.hx, P.hy], a = o.a != null ? o.a : P.a, G = glaiveGeo(g[0], g[1], a, o.len);
    const bx = RD(g[0] - G.dx * o.back), by = RD(g[1] - G.dy * o.back);
    E.part(); bres(bx, by, G.ax, G.ay, (x, y) => px(E, T, x, y, o.wood, 3));
    if (o.cloth) { const cx = RD(g[0] - G.dx * (o.back - 2)), cy = RD(g[1] - G.dy * (o.back - 2)), b = RD(P.beard || 0), s = G.dx >= 0 ? -1 : 1; px(E, T, cx + s, cy, o.cloth, 4); px(E, T, cx + s * 2, cy + 1 - (b < 0 ? 1 : 0), o.cloth, 3); px(E, T, cx + s * 2 + (b > 0 ? 0 : s), cy + 2 - (b < 0 ? 1 : 0), o.cloth, 2); }
    E.part();
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const ch = GLAIVE[r][c]; if (ch === '.') continue; const d = rotUV(G.q, c - 4, r - 8);
      const mm = ch === 'I' ? o.iron : o.metal, t = ch === 'E' || ch === 'H' ? 4 : ch === 'm' ? 2 : 0;
      px(E, T, G.ax + d[0], G.ay + d[1], mm, t);
    }
    if (P.glint && !o.free && o.shine) { const d = rotUV(G.q, 3, -5); px(E, T, G.ax + d[0], G.ay + d[1], o.shine, 4); const e = rotUV(G.q, 3, -4); px(E, T, G.ax + e[0], G.ay + e[1], o.shine, 3); }   // 刃口上两格白光
    const c = rotUV(G.q, 5, -4); return { head: [G.ax + c[0], G.ay + c[1]], socket: [G.ax, G.ay], butt: [bx, by] };
  }

  // ───── 姿势：前手握刀（hx hy a），后手（bhx bhy）：双手时握在柄上 / 磨刀时拿磨石 / 蓄力时举网 ─────
  const P = { hx: 0, hy: 0, a: 0, ai: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, hatF: 0, hatX: 0, hatY: 0, hatR: 0, hatO: 0, dq: 0, dqi: 0, st: 0,
    two: 0, whet: 0, net: 1, fish: 0, tf: 0, gx: 0, gy: 0, cx: 0, cy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(10, -12, 0.1, -4, -11, 0, 0);          // 钩镰拄在身前（柄尾点地），刀头高过斗笠、背钩不碰帽檐
  const K_WALK = K(5, -17, -1.0, -4, -11, 0, 0);          // 扛在肩上，刀头在背后上方
  const K_WIND = K(0, -14, -1.5, 0, 0, -1, -1, 1);        // 双手把刀拉到身后，拧腰
  const K_SWEEP = K(9, -13, 1.55, 0, 0, 1, 1);            // 横扫到身前
  const K_BACK = K(7, -13, 1.2, 0, 0, 0, 0);              // 钩背顺势回带
  const K_HOLD = K(7, -12, 0.7, 0, 0, 0, 0);
  const K_SPIN = K(7, -11, 0.25, -5, -32, -1, -1);        // 蓄力：后手把网举过头顶转圈
  const K_THROW = K(7, -12, 0.3, 13, -22, 1, 1);          // 一甩撒网（后手甩到身前上方）
  const K_PULL = K(6, -12, 0.2, -3, -14, -1, 0);          // 往回一拽
  const K_HURT = K(5, -12, -0.2, -5, -11, -1, -1);
  const K_KNEEL = K(9, -11, 0.15, -2, -9, 1, 0, 4);        // 单膝跪下，钩镰拄地撑住上身
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = keyer([['hx', -32, 31], ['hy', -48, 15], ['ai', -32, 32], ['bhx', -32, 31], ['bhy', -48, 15], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['bx', -8, 8], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['beard', -3, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3],
    ['eyes', 0, 1], ['flash', 0, 1], ['hatF', 0, 1], ['hatX', -2, 16], ['hatY', -2, 30], ['hatR', 0, 3], ['hatO', -1, 1], ['dqi', 0, 48], ['st', 0, 8],
    ['two', 0, 1], ['whet', 0, 2], ['net', 0, 1], ['fish', 0, 2], ['tf', 0, 1]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const WHET = [[1, -27, 0], [1, -30, 1], [1, -27, 0], [1, -30, 1], [0, -24, 0]];   // 待机个性：磨石在刃上来回蹭两下（dx、手高、刃口闪光）
  const T_SWEEP = 2 / 12, T_HOOKB = 3 / 12, T_NET = 0.2, FISH_T = [0.25, 0.3, 0.35], FISH_FLY = 0.12, T_KNEE = INCOMING + 0.42, T_ASH = INCOMING + 1.1;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0;
    P.hatF = 0; P.hatX = 0; P.hatY = 0; P.hatR = 0; P.hatO = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.two = 0; P.whet = 0; P.net = 1; P.fish = 0; P.tf = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.55 && lp < 2.0) { const k = WHET[Math.min(4, Math.floor((lp - 1.55) * 12 + 1e-6))]; P.whet = 1; P.bhx = K_IDLE.hx + k[0]; P.bhy = k[1]; P.glint = k[2]; P.head = 1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 行军大步：上身挺直，钩镰扛在肩上随步点晃；布带反向飘
      setK(K_WALK, K_WALK, 0); parts.gait(P, E.gait(tq)); P.a += P.step * 0.1; P.hy += P.step ? 0 : -1; P.beard = -P.sway;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                        // 横扫：刀拉到身后 → 腰部发力横扫到身前（120° 横弧）→ 钩背回带 → 收回
      P.two = 1;
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.beard = 1; }
      else if (tq < 0.2) { setK(K_SWEEP, K_SWEEP, 0); P.bx = 3; P.beard = -2; P.sway = -1; P.hatO = -1; }
      else if (tq < 0.3) { setK(K_BACK, K_BACK, 0); P.bx = 2; P.beard = -1; P.glint = 1; }
      else if (tq < 0.45) { setK(K_BACK, K_HOLD, ease.out((tq - 0.3) / 0.15)); P.bx = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(1 - q); P.two = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE) {                                        // 后手把网举过头顶转圈（网是特效），背壳血十字逐档变亮
      const q = ease.inOut(clamp01(tq / 0.35)); setK(K_IDLE, K_SPIN, q); P.net = tq < 0.2 ? 1 : 0;
      P.gem = tq < 0.35 ? 0 : tq < 0.7 ? 1 : tq < 1.05 ? 2 : ((f12 & 1) ? 3 : 2); P.rim = tq < 0.35 ? 1 : 2;
      P.beard = -1 - (f12 & 1); P.sway = (f12 & 1) ? -1 : 0; if (tq >= 1.1) P.bx = (f12 & 1) ? 1 : 0;
    } else if (st === CAST) {                                          // 一甩撒网 → 网罩住假人 → 往回一拽，三条赤魂鱼飞回背壳
      P.net = 0; P.rim = 2; P.gem = 2; P.beard = -2; P.sway = -1; P.tf = tq < T_NET + 0.1 ? 1 : 0;
      if (tq < T_NET + 0.05) setK(K_THROW, K_THROW, 0); else setK(K_THROW, K_PULL, ease.out(clamp01((tq - T_NET - 0.05) / 0.12)));
      for (const ft of FISH_T) if (tq >= ft + FISH_FLY && tq < ft + FISH_FLY + 1 / 12) { P.gem = 3; P.rim = 3; }
      if (tq >= FISH_T[2] + FISH_FLY) { P.gem = 3; P.rim = 3; P.fish = 2; }
    } else if (st === RECOVER) {                                       // 把空网卷回肩上
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_PULL, K_IDLE, q); P.net = tq >= 0.35 ? 1 : 0;
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.35 ? 2 : q < 0.7 ? 1 : 0; P.fish = tq < 0.4 ? ((f12 >> 1) & 1) : 0;
      if (tq >= 0.2 && tq < 0.35) { P.bhx = -3; P.bhy = -21; }          // 后手把网甩回肩上
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.hatO = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 跪倒：单膝跪下、钩镰拄地、头垂下、斗笠滑落 → 从头到脚化成灰（死亡套件 ash）→ 红布带最后落下
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.hatO = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 2; P.gem = (f12 & 1) ? 1 : 0; }
      else {
        const kq = clamp01((d - 0.3) / 0.12); setK(K_HURT, K_KNEEL, ease.in(kq)); P.bx = -1; P.eyes = 1; P.beard = 2; P.sway = d < 0.5 ? 1 : 0;
        const hq = clamp01((d - 0.34) / 0.3); P.hatF = 1; P.hatX = RD(9 * hq); P.hatY = RD(21 * (1 - hq * hq)); P.hatR = hq < 0.5 ? 0 : 1;    // 斗笠从垂下的头上滑落，翻到身前地上
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : 4;
        if (d >= 1.1) P.dq = 1;                                        // 之后由死亡套件（化灰）接管
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.a = RD(P.a / ASTEP) * ASTEP; P.ai = RD(P.a / ASTEP);
    if (P.two) { const b = parts.onShaft(P, {}, -5); P.bhx = b[0]; P.bhy = b[1]; } else { P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + (P.whet ? 0 : yo); }
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dqi = RD(P.dq * 48);
    const R = parts.rig(P, BODY), e = parts.edges(R, R.yS + 5);
    P.gx = e[0] - 2 + P.bx; P.gy = R.yS + 6;                       // 发光体 = 背壳上的血十字（壳心）
    P.cx = R.hipFx + 2 + P.bx; P.cy = R.yWaist + 3;                    // 鱼篓中心
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY), sk = M.skin, skD = M.skinD;
    const eye = P.gem >= 4 ? 0 : P.gem >= 2 || P.glint ? M.eyeB : M.eyeA, cross = P.gem >= 4 ? M.crossX : P.gem === 3 ? M.crossC : P.gem === 2 ? M.crossB : P.gem === 1 ? M.crossA : M.blood;
    const hatOn = !P.hatF, hatO = { mat: M.hat, band: M.band, off: P.hatO };
    if (hatOn) hatTails(E, R, P, { mat: M.band, len: 5, off: P.hatO });
    const armB = { side: 'B', sleeve: 'loose', mat: M.sleeveD, cuff: M.rope, hand: skD, grip: P.two ? 'none' : 'fist' };
    if (!P.tf) parts.arm(E, R, P, armB);
    parts.legs(E, R, P, { style: 'sandal', mat: M.pants, matD: M.pantsD, boot: M.rope, bootD: M.ropeD });
    strawCoat(E, R, P, { mat: M.straw, hem: -7, flare: 2 });                                          // 蓑衣内衬（罩衣下面露出一圈稻草裙 + 草穗）
    parts.torso(E, R, P, { style: 'coat', mat: M.robe, hem: -9, flare: 1.5, strap: M.band, strap2: M.band, belt: M.rope });   // 暗朱红罩衣（短到胯下，露出长腿）+ 胸前交叉朱红带
    const e = parts.edges(R, R.yS + 5);
    turtleShell(E, R, e[0] - 1, R.yS + 6, 3.5, 6, { mat: M.shell, cross });                     // 背甲：贴在背上、往后隆起 4 格，壳面血十字
    creel(E, R, P, R.hipFx - 1, R.yWaist + 2, 5, 6, { mat: M.basket, fish: P.gem >= 4 ? M.crossX : M.fish, wag: P.fish === 1, string: M.rope });
    if (P.net) netRoll(E, R, P, { mat: M.net, lead: M.lead });
    if (P.tf) parts.arm(E, R, P, armB);                                                               // 撒网 / 拽网的那只手甩到身前
    parts.head(E, R, P, { mat: sk, face: 'gaunt', eye: eye || sk, eyeStyle: eye ? 'glow' : 'dot', nose: 'small', mouth: 'line', ear: 'none', shade: 3 });
    if (hatOn) bambooHat(E, R, P, hatO);
    if (P.hatF) bambooHat(E, R, P, { mat: M.hat, band: M.band, at: [R.hx + P.hatX, -P.hatY - (P.hatR ? 5 : 0)], rot: P.hatR });
    hookGlaive(E, R, P, { wood: M.wood, metal: M.steel, iron: M.iron, cloth: M.cloth, shine: M.lead, len: GL.len, back: GL.back });
    if (P.two) parts.hand(E, R, P, { side: 'B', hand: skD });
    else if (P.whet) { E.part(); px(E, R, P.bhx, P.bhy - 1, M.whet, 4); px(E, R, P.bhx + 1, P.bhy - 1, M.whet, 3); parts.hand(E, R, P, { side: 'B', hand: skD }); }   // 磨石
    parts.arm(E, R, P, { sleeve: 'loose', mat: M.sleeve, cuff: M.rope, hand: sk });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let swT = 9, hbT = 9, netT = 9, drapeT = 9, ribT = 9, chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0;
  const fishT = [9, 9, 9];
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const NET_X = DUMMY_X, NET_Y = HY - 18;
  function netOverhead(f12, stT) {                                     // 头顶转圈的网：椭圆点阵，每帧转 1/4 格距，后面拖两层朱红残影；外沿四颗铅坠
    const cx = wx(P.bhx), cy = wy(P.bhy) - 3, rx = 8, ry = 3, n = 20, ph = (f12 % 4) / 4;
    for (let g = 2; g >= 0; g--) {
      const off = ph - g * 0.25, c = g === 0 ? EL[1] : g === 1 ? EL[3] : EL[4];
      for (let k = 0; k < n; k++) { if (g > 0 && (k & 1)) continue; const a = (k + off) / n * 6.2832; put(RD(cx + Math.cos(a) * rx), RD(cy + Math.sin(a) * ry), c); }
    }
    for (let k = 0; k < 8; k++) { const a = (k + ph) / 8 * 6.2832; put(RD(cx + Math.cos(a) * rx * 0.5), RD(cy + Math.sin(a) * ry * 0.5), EL[2]); }
    for (let k = 0; k < 4; k++) { const a = (k + ph * 5) / 4 * 6.2832; put(RD(cx + Math.cos(a) * (rx + 1)), RD(cy + Math.sin(a) * (ry + 1)), 17); }
  }
  function netFan(q, f12) {                                            // 撒出去的网：扇形，飞向假人时张开；外沿一圈铅坠白点
    const x0 = wx(K_THROW.bhx), y0 = wy(K_THROW.bhy), cx = RD(x0 + (NET_X - 4 - x0) * q), cy = RD(y0 + (NET_Y - y0) * q - 8 * 4 * q * (1 - q)), r = 3 + 9 * q;
    for (let s = 1; s <= 2; s++) { const rr = r * s / 2, n = Math.ceil(rr * 2.2); for (let k = 0; k <= n; k++) { const a = -1.05 + 2.1 * k / n; if (s === 1 && (k & 1)) continue; put(RD(cx + Math.cos(a) * rr * 0.55), RD(cy + Math.sin(a) * rr), s === 2 ? EL[1] : EL[2]); } }
    for (let k = -2; k <= 2; k++) { const a = k * 0.5; for (let d = 1; d < r; d += 2) put(RD(cx + Math.cos(a) * d * 0.55), RD(cy + Math.sin(a) * d), EL[2]); }
    for (let k = -3; k <= 3; k++) { const a = k * 0.35; put(RD(cx + Math.cos(a) * r * 0.55) + 1, RD(cy + Math.sin(a) * r), (k + f12) & 1 ? 21 : 17); }
  }
  function netDrape(t, f12) {                                          // 罩在假人身上的网：菱形网眼点阵，收紧时往里缩，铅坠一圈垂在下沿
    const sh = Math.min(2, RD(t * 8)), x0 = DUMMY_X - 10 + sh, x1 = DUMMY_X + 10 - sh, y0 = HY - 31 + sh, y1 = HY - 6;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const e = Math.pow((x - DUMMY_X) / (x1 - DUMMY_X + 0.5), 2) + Math.pow((y - (y0 + y1) / 2) / ((y1 - y0) / 2 + 0.5), 2); if (e > 1) continue;
      if (((x + y) & 3) === 0 || ((x - y) & 3) === 0) put(x, y, e > 0.8 ? EL[1] : EL[2]);
    }
    for (let x = x0 + 1; x < x1; x += 3) put(x, y1 + 1, (x + f12) & 1 ? 21 : 17);
  }
  // 赤魂鱼（特效外形）：同步卒的魂鱼，用血朱色阶
  const FISH = [[0, 0, 0], [1, 0, 1], [2, 0, 1], [3, 0, 1], [4, 0, 2], [1, 1, 2], [2, 1, 2], [3, 1, 3], [2, -1, 1], [5, -1, 3], [5, 1, 3]];
  function drawFish(x, y, vx, vy, R) {
    const d = vx < 0 ? -1 : 1, tilt = Math.abs(vy) > Math.abs(vx) * 0.6 ? Math.sign(vy) : 0, at = (k, j) => [RD(x - d * k), RD(y + j - (k >= 3 ? tilt : 0))];
    for (const [k, j] of FISH) { const p = at(k, j); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(p[0] + dx, p[1] + dy, 0); }
    for (const [k, j, c] of FISH) { const p = at(k, j); put(p[0], p[1], R[c]); }
  }
  function fishAt(i, t) {                                              // 第 i 条赤魂鱼：从网里被拽出，飞回背壳十字
    const q = clamp01(t / FISH_FLY), x0 = DUMMY_X - 2, y0 = HY - 14 - i * 4, x1 = wx(P.gx), y1 = wy(P.gy);
    return [x0 + (x1 - x0) * q, y0 + (y1 - y0) * q - 10 * 4 * q * (1 - q), x1 - x0, (y1 - y0) - 10 * 4 * (1 - 2 * q)];
  }
  function onEnter(s) {
    if (s !== CAST) return;                                            // 一甩撒网：天空闪白、震屏 2 格
    netT = 0; burst(wx(K_THROW.bhx), wy(K_THROW.bhy), 14, 40, 100, 0.2, 0.45, R_EL, 10); shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SWEEP) {                               // 横扫命中
      swT = 0; hitDummy(0, 1); burst(DUMMY_X - 2, HY - 13, 12, 40, 110, 0.15, 0.4, R_IMP, 10); fx.cross(DUMMY_X - 2, HY - 13, 4, R_IMP, 0.2);
      sfx('swing', { kind: 'slash', w: 0.6 }); sfx('hit', { mat: 'flesh', w: 0.6 });
    }
    if (s === ATTACK && t === T_HOOKB) { hbT = 0; burst(DUMMY_X - 5, HY - 12, 5, 20, 50, 0.1, 0.25, R_IMP, 4); }   // 钩背回带：再蹭出几点火星
    if (s === CAST && t === T_NET) {                                   // 网罩住假人：血朱描边、下陷 1 格
      drapeT = 0; dummyFx({ dur: 0.75, outline: R_EL, sink: 1 }); hitDummy(0, 1); burst(NET_X, NET_Y - 6, 12, 30, 70, 0.2, 0.4, R_EL, 6);
      sfx('impact', { pal: 'blood', w: 0.5 });
    }
    for (let i = 0; i < 3; i++) {
      if (s === CAST && t === FISH_T[i]) { fishT[i] = 0; burst(DUMMY_X - 2, HY - 14 - i * 4, 6, 20, 50, 0.15, 0.3, R_EL, 4); if (i === 0) hitDummy(0, -1); }
      if (s === CAST && t === FISH_T[i] + FISH_FLY) {                  // 赤魂鱼飞进背壳：十字一亮；最后一条爆亮 + 冲击环 + 外爆 20
        const x = wx(P.gx), y = wy(P.gy), last = i === 2;
        burst(x, y, last ? 20 : 6, 40, last ? 120 : 70, 0.2, last ? 0.55 : 0.3, R_EL, 10);
        if (last) { ring(x, y, 1, R_EL); fx.cross(x, y, 6, R_EL, 0.3); shake(0.12, 1); }
        sfx('impact', { pal: 'blood', w: last ? 0.7 : 0.35 });
      }
    }
    if (s === DEATH && Math.abs(t - T_KNEE) < 1e-9) { for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 6 + Math.random() * 20, HY - 1, (Math.random() - 0.5) * 28, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.6 }); }
    if (s === DEATH && Math.abs(t - T_ASH) < 1e-9) {                   // 化灰：先把「最后一帧跪姿」画好烤好，再交给死亡套件
      poseAt(DEATH, T_ASH - 1 / 12, T_ASH - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('ash', { ramp: FXI.dust }); ribT = 0;
    }
  }
  const EVENTS = [[], [], [T_SWEEP, T_HOOKB], [], [T_NET].concat(FISH_T, FISH_T.map((f) => f + FISH_FLY)), [], [], [T_KNEE, T_ASH], []];
  function hurtFx(s) {                                                 // 亡灵：骨灰火花 + 几点血朱
    const hx = HX + 1, hy = HY - 15; burst(hx, hy, s === DEATH ? 22 : 14, 40, 120, 0.25, 0.5, FXI.dust, 16); burst(hx, hy, s === DEATH ? 8 : 4, 20, 60, 0.3, 0.6, R_EL, 8);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > 0.35) {                              // 网甩出的朱红碎光（沿切线飞走）
      chargeAcc += dt * (6 + 14 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, cx = wx(P.bhx), cy = wy(P.bhy) - 3; spawn(K_BURST, cx + Math.cos(a) * 8, cy + Math.sin(a) * 3, -Math.sin(a) * 40, Math.cos(a) * 14 - 6, 0.25 + Math.random() * 0.2, R_EL); }
      emberAcc += dt * 10; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_SPIRAL_PT, wx(P.gx), wy(P.gy), 18, 0, 9, R_EL, Math.random() * 6.2832, 8 + Math.random() * 5, 3); }   // 血光往背壳十字收
    }
    if (state === CAST) for (let i = 0; i < 3; i++) if (fishT[i] < FISH_FLY && (E.stepN & 1)) { const p = fishAt(i, fishT[i]); spawn(K_TRAIL, p[0] + 3, p[1], 12 + Math.random() * 10, (Math.random() - 0.5) * 8, 0.2, R_EL); }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.6 }); for (let i = 0; i < 2; i++) spawn(K_DUST, wx(P.step > 0 ? 5 : -4) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 7, 0.3 + Math.random() * 0.2, FXI.dust); } lastStep = P.step; }
    if (state === DEATH && stT > INCOMING + 1.1 && stT < INCOMING + 2.2) { soulAcc += dt * 12; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 6 + Math.random() * 18, HY - 4 - Math.random() * 20, (Math.random() - 0.5) * 6, -12 - Math.random() * 12, 0.7 + Math.random() * 0.6, FXI.soul); } }
    swT += dt; hbT += dt; netT += dt; drapeT += dt; ribT += dt; for (let i = 0; i < 3; i++) fishT[i] += dt;
  }
  function fxReset() { swT = 9; hbT = 9; netT = 9; drapeT = 9; ribT = 9; chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; fishT[0] = fishT[1] = fishT[2] = 9; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid(f12) { if (drapeT < 0.6) netDrape(drapeT, f12); }
  function fxFront(f12) {
    const st = E.state, stT = E.stT;
    if (swT < 2 / 12) {                                                // 横扫：从身后到身前的 120° 横弧（压扁的椭圆，前端最亮）
      const cx = wx(3 + P.bx), cy = wy(-13), late = swT >= 1 / 12, d = P.flip ? -1 : 1;
      for (let k = 0; k <= 40; k++) { const th = (150 - 120 * k / 40) * Math.PI / 180; if (late && (k & 1)) continue; const c = k > 30 ? EL[0] : k > 18 ? 31 : 30; put(RD(cx + d * Math.cos(th) * 20), RD(cy + Math.sin(th) * 6), late ? (k > 30 ? 31 : 29) : c); if (!late && k > 20) put(RD(cx + d * Math.cos(th) * 19), RD(cy + Math.sin(th) * 6 - 1), 30); }
    }
    if (hbT < 2 / 12) { const cx = wx(K_BACK.hx + 11), cy = wy(K_BACK.hy - 4); for (let k = 0; k < 5; k++) put(cx - k, cy + (k >> 1), hbT < 1 / 12 ? 31 : 29); }   // 钩背回带的一小段拖影
    if (st === CHARGE && stT >= 0.3) netOverhead(f12, stT);
    if (st === CAST && netT < T_NET) netFan(netT / T_NET, f12);
    if (st === CAST) for (let i = 0; i < 3; i++) if (fishT[i] < FISH_FLY) { const p = fishAt(i, fishT[i]); drawFish(RD(p[0]), RD(p[1]), p[2], p[3], EL); }
    if (st === DEATH && ribT < 1.5 && ribT > 0.5) {                    // 化灰之后，斗笠上的两条红布带最后飘落
      const q = clamp01((ribT - 0.5) / 0.7), y = RD(HY - 24 + 23 * q), x = RD(HX + 4 + Math.sin(ribT * 9) * 2), gone = clamp01((ribT - 1.25) / 0.25);
      for (let k = 0; k < 5; k++) for (let j = 0; j < 2; j++) { if (hash(k + j * 7, RD(ribT * 12)) < gone) continue; const yy = Math.min(HY - 1 + j, y + (q < 1 ? RD(Math.sin(k * 1.2 + ribT * 10) * (1 - q)) : 0)); put(x - k * 1 + j * 2 - (q >= 1 ? k : 0), q >= 1 ? HY - 1 : yy + j, j ? 56 : 57); }
    }
  }

  return {
    name: '赤十字', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eyeA, M.eyeB, M.crossA, M.crossB, M.crossC, M.fish], HIT_POINT: [2, -15], EVENTS,
    deathKit: { mode: 'ash', at: T_ASH },
    SFX: { body: 'flesh', how: 'dissolve', pal: 'blood', style: 'summon', w: 0.6 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront, hurtFx,
  };
});
