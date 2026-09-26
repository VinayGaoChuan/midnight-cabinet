// 步卒（部队 · 不死 · 先锋 · 普通）：捕魂的溺亡渔夫。瘦、微驼，尖锥竹斗笠压住眉眼（檐下只露两点青色魂火眼），稻草蓑衣 + 一圈草穗下摆，
// 后臂挎一面六角纹龟壳盾，腰间竹鱼篓（篓口露一截发光魂鱼尾），手里一根比人还长的竹钩竿（竿头铁鱼钩、鱼线、红白浮漂）。
// 攻击 = 钩拉（双手持竿前探，钩尖越过假人后猛地回拽）；技能 = 特性「初级渔夫」：抛竿让浮漂落到假人头上，钓出一条魂鱼甩进鱼篓，攒一层。
// 升级成「赤十字」（RedCross.js）→「炎帝」（EmperorOfFlame.js）：同一个人——斗笠、龟壳、蓑衣、鱼篓、钩，一级级长壮、变热。
PCD.define('FootSoldier', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, keyer, hash,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_BURST, K_TRAIL, K_EMBER,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2, px = parts.px;
  const quad = (a) => ((RD(a / HALF) % 4) + 4) % 4;
  const rotUV = (q, u, v) => (q === 0 ? [u, v] : q === 1 ? [-v, u] : q === 2 ? [-u, -v] : [v, -u]);
  function bres(x0, y0, x1, y1, cb) {
    x0 = RD(x0); y0 = RD(y0); x1 = RD(x1); y1 = RD(y1);
    const ax = Math.abs(x1 - x0), ay = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = ax + ay;
    for (let n = 0; n < 200; n++) { cb(x0, y0, n); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= ay) { e += ay; x0 += sx; } if (e2 <= ax) { e += ax; y0 += sy; } }
  }

  // ───── 元素：渔魂 · 冷魂青（FXI.soul：22 青 → 23 蓝 → 24 紫 → 25 深紫 → 3 夜）。升级线逐级变热：冷魂 → 赤潮 → 帝焰 ─────
  const R_EL = FXI.soul, EL = FXR[R_EL], R_IMP = FXI.impact, R_ST = FXI.steel;

  // ───── 材质（parts.mats：名字D = 暗一级，远侧腿 / 后臂用）─────
  const STRAW = ['#221a0c', '#4e3e1e', '#7e6a38', '#aa965a'], SHELL = ['#141a0c', '#2e3a1a', '#4e5a2a', '#7a8446'];
  const M = parts.mats(E, {
    straw: { r: STRAW, band: 2 }, strawM: STRAW, hat: 'sand', bamboo: 'sand', skin: 'pale', rope: 'wood', basket: 'wood',
    shell: SHELL, steel: 'steel', red: 'crimson', white: 'white',
    eyeA: { r: [25, 23, 22, 22], flat: 1 }, eyeB: { r: [25, 22, 21, 21], flat: 1 },     // 魂火眼：平时青 / 蓄满白芯
    fish: { r: [25, 23, 22, 22], flat: 1 }, fishHot: { r: [25, 22, 21, 21], flat: 1 },  // 篓口的魂鱼尾（发光体）
    fline: { r: [255, 18, 18, 18], flat: 1 },                                            // 鱼线：勾线色 255 = 不勾线（1 格细线不被撑粗）
  });
  const BODY = { body: 'standard', sw: 3, lw: 2, limb: 0.9, hunch: 1, lift: 1, fall: 'front' };
  const R0 = parts.rig({}, BODY);
  const POLE = { wood: M.bamboo, metal: M.steel, len: 14, back: 10 };
  const HX = 77, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(84, 60, 36, 54);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 4, 7, 12], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['bamboo', 'fline', 'red', 'white', 'eyeA', 'eyeB', 'fish', 'fishHot', 'rope', 'steel', 'hat', 'skin']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ═════ 候选部件（本模块自带，以后统一收进 parts.js）═════
  // 候选部件：斗笠 bambooHat —— 尖锥竹斗笠。帽檐左右各比头宽 3 格、帽尖高出头顶 3 格；帽檐压在眼睛上一行，檐下那一行脸被分界线压成阴影，只剩发光的眼。
  //   o = { mat 竹篾, at [x, y] 掉在地上（精灵本地坐标，帽檐那一行落在 y）+ rot 翻滚档 0–3, off 戴在头上时前后偏移（惯性）}
  //   头饰坐标：u = 0 是头中线（6 格宽的头中心在 u 0.5），v = 0 是头顶那一行。一个部件。
  const HAT_ROWS = [[-3, 0, 1], [-2, -1, 2], [-1, -3, 4], [0, -4, 5], [1, -5, 6]];
  function hatT(R, o) { return o.at ? { r0: (o.rot || 0) & 3, tx: RD(o.at[0]), ty: RD(o.at[1]) - 1, rot: 0, ox: 0, oy: 0 } : { r0: 0, tx: R.hx + (o.off || 0), ty: R.htop, rot: R.rot, ox: R.ox, oy: R.oy }; }
  function bambooHat(E, R, P, o) {
    const T = hatT(R, o), m = o.mat;
    E.part();
    for (const [v, a, b] of HAT_ROWS) for (let u = a; u <= b; u++) px(E, T, u, v, m, 0);
    for (let v = -2; v <= 0; v++) { const k = (v + 3) / 4; px(E, T, RD(0.5 - 3.4 * k), v, m, 2); px(E, T, RD(0.5 + 3.6 * k), v, m, 2); }   // 竹篾辐条
    px(E, T, 0, -3, m, 4); px(E, T, -2, 0, m, 4);
  }
  // 候选部件：龟壳 turtleShell —— 竖立的椭圆龟壳（w × h 格，偶数宽高也居中：在半格网格上算椭圆）：外圈一圈缘盾（深一级，每 3 格一道墨色缝，
  //   剪影边上读成一个个缺口）；中间一列 2 格宽的脊盾（两道横缝分成上中下三块）；脊盾两侧各一道竖缝分出肋盾；左上两格高光。随 rig 转（倒地时压在背上）。
  //   (x0, y0) 外接框左上角（rig 本地坐标），o = { mat, w（默认 8）, h（默认 10）}。画在披肩之后：壳自己压一圈分界线，背后鼓出一个半圆。一个部件。
  function turtleShell(E, R, x0, y0, o) {
    const m = o.mat, W = o.w || 8, H = o.h || 10, rx = W / 2, ry = H / 2, sy = Math.max(0.5, Math.floor(ry * 0.3) + 0.5);
    E.part();
    for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) {
      const i = u - rx + 0.5, j = v - ry + 0.5, e = (i * i) / (rx * rx + 0.3) + (j * j) / (ry * ry + 0.3); if (e > 1) continue;
      let t = i + j < -1.5 ? 4 : 3;                                                    // 甲片：左上半受光（圆顶感），其余基色
      if (e > 0.6) t = ((u * 2 + v) % 3 === 0) ? 1 : (u + v <= 3 ? 3 : 2);             // 缘盾：左上一段基色，其余深一级；每 3 格一道墨色缝
      else if (Math.abs(i) < 1 && Math.abs(Math.abs(j) - sy) < 0.1) t = 2;             // 脊盾两道横缝
      else if (Math.abs(Math.abs(i) - 1.5) < 0.1 && Math.abs(j) <= sy + 0.1) t = 2;    // 肋盾竖缝
      else if ((i === -0.5 && j === -sy - 2) || (i === -1.5 && j === -sy - 1)) t = 4;         // 左上两格高光（斜着一对）
      px(E, R, x0 + u, y0 + v, m, t);
    }
  }
  // 候选部件：鱼篓 creel —— 竹编鱼篓：口沿一行、2×2 编纹亮暗交错、篓底收窄 1 格；篓口伸出一截发光魂鱼尾（fish 发光体，单独一个部件，wag 摆尾）。
  //   (x0, y0) 口沿左端（rig 本地坐标），w × h；o = { mat, fish, wag }。
  function creel(E, R, x0, y0, w, h, o) {
    const m = o.mat;
    E.part();
    for (let j = 0; j < h; j++) { const a = x0 + (j === h - 1 ? 1 : 0), b = x0 + w - 1 - (j === h - 1 ? 1 : 0); for (let x = a; x <= b; x++) px(E, R, x, y0 + j, m, j === 0 ? (x === a ? 4 : 3) : ((((x - x0) >> 1) + (j >> 1)) & 1) ? 2 : 0); }
    if (!o.fish) return;
    E.part(); const f = o.fish, s = o.wag ? 1 : 0;
    px(E, R, x0 + 2, y0 - 1, f, 3); px(E, R, x0 + 1 + s, y0 - 2, f, 4); px(E, R, x0 + 3 + s, y0 - 2, f, 2);
  }
  // 候选部件：蓑衣 strawCoat —— parts.torso（tunic 形）上加稻草纹：竖草茎每 4 行一层错开、层下沿一排草尖亮点；下摆外挂一圈草穗（长短相间，随 sway 反向摆）。
  //   o = parts.torso 的参数 + fringe 草穗长（默认 2）。和躯干同一个部件。读 P.sway。
  function strawCoat(E, R, P, o) {
    const tor = parts.torso(E, R, P, Object.assign({ style: 'tunic' }, o)), m = o.mat, LL = tor.rows[0], RR = tor.rows[1], y0 = tor.y0, hem = tor.hem, sw = RD(P.sway || 0);
    for (let y = y0 + 2; y < hem; y++) {
      const L = LL[y - y0], Rr = RR[y - y0], tier = Math.floor((y - y0 - 2) / 4);
      for (let x = L + 1; x < Rr; x++) if ((((x + tier * 2) % 3) + 3) % 3 === 0 && (y & 1)) px(E, R, x, y, m, 2);
      if ((y - y0 - 2) % 4 === 3) for (let x = L + 1; x < Rr; x += 2) px(E, R, x, y, m, 4);
    }
    const L = LL[hem - y0], Rr = RR[hem - y0], n = o.fringe || 2;
    for (let x = L; x <= Rr; x++) { const k = (((x - sw) % 2) + 2) % 2, len = n - k; for (let j = 1; j <= len; j++) px(E, R, x + (j === len ? sw : 0), hem + j, m, j === len ? 2 : 3); }
    return tor;
  }
  // 候选部件：钩竿 hookPole —— 1 格竹竿（每 4 格一道竹节）+ 竿头 5×5 铁鱼钩（只按 90° 换朝向；钩口 3 格宽，剪影里看得出是钩）。
  //   o = { wood, metal, len 握点到钩座, back 握点后竿长, at [x, y] 握点（缺省 P.hx / hy）, a 角度（缺省 P.a）, free 1 = 掉在地上不跟身体转 }
  //   两个部件：竿 → 钩。返回 { point 钩尖（挂鱼线）, socket, butt }
  const HOOK_ROWS = ['.MMM.', 'M...M', 'M...M', 'M...E', 'T....'];
  function hookGeo(gx, gy, a, len) { const dx = Math.sin(a), dy = -Math.cos(a); return { dx, dy, ax: RD(gx + dx * len), ay: RD(gy + dy * len), q: quad(a) }; }
  function hookPoint(gx, gy, a, len) { const G = hookGeo(gx, gy, a, len), p = rotUV(G.q, 4, -1); return [G.ax + p[0], G.ay + p[1]]; }
  function hookPole(E, R, P, o) {
    const T = o.free ? parts.FREE : R, g = o.at || [P.hx, P.hy], a = o.a != null ? o.a : P.a, G = hookGeo(g[0], g[1], a, o.len);
    const bx = RD(g[0] - G.dx * o.back), by = RD(g[1] - G.dy * o.back);
    E.part(); bres(bx, by, G.ax, G.ay, (x, y, n) => px(E, T, x, y, o.wood, (n % 4) === 2 ? 2 : 3));
    E.part();
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) { const ch = HOOK_ROWS[r][c]; if (ch === '.') continue; const d = rotUV(G.q, c, r - 4); px(E, T, G.ax + d[0], G.ay + d[1], o.metal, ch === 'E' ? 4 : ch === 'T' ? 2 : 0); }
    const p = rotUV(G.q, 4, -1); return { point: [G.ax + p[0], G.ay + p[1]], socket: [G.ax, G.ay], butt: [bx, by] };
  }
  // 候选部件：鱼线浮漂 bobber —— 鱼线从 (x, y) 垂下 len 格（无勾线材质），末端一只红顶白身的浮漂（2×3，单独一个部件，有勾线）；sw 线尾左右晃。
  function bobber(E, R, x, y, len, sw, o) {
    E.part(); for (let k = 1; k < len; k++) px(E, R, x + (k > len * 0.6 ? sw : 0), y + k, o.line, 3);
    E.part(); const fx0 = x + sw, fy = y + len;
    px(E, R, fx0, fy, o.red, 4); px(E, R, fx0 + 1, fy, o.red, 2); px(E, R, fx0, fy + 1, o.white, 4); px(E, R, fx0 + 1, fy + 1, o.white, 3); px(E, R, fx0, fy + 2, o.white, 3); px(E, R, fx0 + 1, fy + 2, o.white, 2);
  }

  // ───── 姿势：前手握竿（hx hy a），后手（bhx bhy）挎龟壳 / 双手时握在竿上 ─────
  const P = { hx: 0, hy: 0, a: 0, ai: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0,
    gem: 0, glint: 0, rim: 0, rs: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatF: 0, hatX: 0, hatY: 0, hatR: 0, hatO: 0, dq: 0, dqi: 0, st: 0,
    flt: 0, line: 0, two: 0, fish: 0, pole: 0, gx: 0, gy: 0, kx: 0, ky: 0, cx: 0, cy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(5, -11, 0.35, -3, -9, 0, 1);          // 竿斜伸在前，浮漂垂在竿尖下，歪头盯着
  const K_WALK = K(7, -9, 0.12, -3, -9, 0, 0);           // 拄竿：竿尾点地
  const K_WIND = K(2, -13, -0.4, 0, 0, -1, 0, 1);        // 双手收竿、后坐（钩甩到脑后）
  const K_REACH = K(9, -13, 1.45, 0, 0, 1, 1);           // 竿前探，钩尖越过假人
  const K_YANK = K(6, -15, 0.7, 0, 0, -1, 0);            // 猛地回拽
  const K_HOLD = K(5, -13, 0.5, 0, 0, 0, 0);
  const K_BACK = K(3, -15, -0.55, -3, -9, -1, -1);       // 抛竿：先后引
  const K_FLING = K(8, -14, 0.95, -3, -9, 1, 1);         // 再前甩
  const K_WAIT = K(4, -16, 0.15, -2, -10, -1, 1);        // 后仰、竿竖高，盯着假人头上的浮漂（钩尖离浮漂 11 格，鱼线的虚线和下垂看得见）
  const K_RAISE = K(5, -18, -0.05, 0, 0, -1, -1);        // 扬竿（竿竖起）
  const K_HOLD2 = K(6, -15, 0.25, 0, 0, 0, 0);
  const K_HURT = K(4, -11, 0.1, -4, -9, -1, -1);
  const K_STAG = K(8, -9, 0.9, -1, -8, 2, 1, 2);         // 踉跄前扑
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = keyer([['hx', -32, 31], ['hy', -48, 15], ['ai', -32, 32], ['bhx', -32, 31], ['bhy', -48, 15], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['bx', -8, 8], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['beard', -3, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['rs', 0, 1],
    ['eyes', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3], ['hatF', 0, 1], ['hatX', -26, 2], ['hatY', -2, 8], ['hatR', 0, 3], ['hatO', -1, 1], ['dqi', 0, 48], ['st', 0, 8],
    ['flt', -4, 3], ['line', 0, 2], ['two', 0, 1], ['fish', 0, 2], ['pole', 0, 1]]);
  const SWAY_IDLE = [0, 1, 0, -1];
  const LIFT = [[-0.05, -1, -2, 0], [-0.15, -2, -4, 1], [-0.15, -2, -4, 1], [-0.05, -1, -1, 0], [0, 0, 1, 0]];   // 待机个性：轻轻提一次竿（角度、手高、浮漂、眼亮）
  const T_REACH = 2 / 12, T_YANK = 3 / 12, T_JERK = 4 / 12, T_ARRIVE = 0.32, FLY = 0.32, T_LAND = INCOMING + 0.66, T_FISH = INCOMING + 0.9;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.rs = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatF = 0; P.hatX = 0; P.hatY = 0; P.hatR = 0; P.hatO = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.flt = 0; P.line = 0; P.two = 0; P.fish = 0; P.pole = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3]; P.line = 1; P.flt = (b + 1) & 1;
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { const k = LIFT[Math.min(4, Math.floor((lp - 1.6) * 12 + 1e-6))]; P.a += k[0]; P.hy += k[1]; P.flt = k[2]; P.glint = k[3]; P.head = k[3] ? 0 : 1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 拄竿拖步：接触帧竿尾点地，经过帧竿提起往前挪；草穗、浮漂反向晃
      setK(K_WALK, K_WALK, 0); parts.gait(P, E.gait(tq)); P.line = 2;
      if (P.step === 0) { P.hy -= 1; P.hx += 1; P.a += 0.1; }
      P.flt = -P.sway;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                        // 钩拉：收竿 → 前探（钩尖越过假人）→ 猛地回拽 → 收回
      P.two = 1;
      if (tq < 0.12) setK(K_IDLE, K_WIND, ease.out(tq / 0.12));
      else if (tq < 0.2) { setK(K_REACH, K_REACH, 0); P.bx = 3; P.sway = -1; P.hatO = -1; }
      else if (tq < 0.3) { setK(K_YANK, K_YANK, 0); P.bx = 1; P.sway = 1; P.hatO = 1; P.glint = 1; }
      else if (tq < 0.45) { setK(K_YANK, K_HOLD, ease.out((tq - 0.3) / 0.15)); P.bx = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.two = q < 0.5 ? 1 : 0; P.line = q < 0.5 ? 0 : 2; }
    } else if (st === CHARGE) {                                        // 抛竿：后引 → 前甩 → 盯着假人头上的浮漂；魂火眼 1 → 2 档
      if (tq < 0.2) setK(K_IDLE, K_BACK, ease.out(tq / 0.2));
      else if (tq < 0.3) setK(K_FLING, K_FLING, 0);
      else setK(K_FLING, K_WAIT, ease.inOut(clamp01((tq - 0.3) / 0.4)));
      P.gem = tq < 0.7 ? 1 : 2; P.rim = tq < 0.45 ? 1 : 2; P.sway = tq < 0.3 ? 1 : (f12 & 1) ? -1 : 0;
      if (tq >= 1.1) P.hy += (f12 & 1);                                // 最后 0.3 s 手在抖
    } else if (st === CAST) {                                          // 扬竿（定格）→ 魂鱼甩回来钻进鱼篓
      P.two = 1; P.gem = 3; P.rim = 2; P.sway = -1;
      if (tq < 2 / 12) setK(K_RAISE, K_RAISE, 0); else setK(K_RAISE, K_HOLD2, ease.out(clamp01((tq - 2 / 12) / 0.25)));
      if (tq >= T_ARRIVE) { P.fish = 2; if (tq < T_ARRIVE + 1 / 12) { P.rim = 3; P.rs = 1; } }
    } else if (st === RECOVER) {                                       // 鱼篓里的鱼尾摆一摆，竿收回
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_HOLD2, K_IDLE, q);
      P.two = q < 0.35 ? 1 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.3 ? 1 : 0; P.fish = tq < 0.4 ? ((f12 >> 1) & 1) : 0; P.line = q > 0.8 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.sway = 1; P.hatO = 1; P.flash = h < 1 / 12 ? 1 : 0; P.line = 2; P.flt = -2; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.line = 2; P.flt = 1; }
      else { setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15))); P.line = 1; }
    } else if (st === DEATH) {                                         // 前扑：踉跄 → 脸朝下扑倒，斗笠飞出滚两圈，龟壳压在背上 → 魂火眼熄灭 → 消散
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.sway = 1; P.hatO = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_STAG, K_STAG, 0); P.bx = d < 0.4 ? 0 : 1; P.hatO = -1; P.sway = -1; P.gem = (f12 & 1) ? 2 : 1; }
      else {
        P.lying = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.pole = 1; P.crouch = 0; P.lean = 0; P.head = 0; P.bx = 1;
        P.hx = R0.sFx + 1; P.hy = R0.yWaist + 1; P.bhx = R0.sBx; P.bhy = R0.yWaist + 2; P.a = 0;
        if (d >= 0.62) { P.hatF = 1; const hq = clamp01((d - 0.62) / 0.45); P.hatX = RD(-24 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 8); P.hatR = (8 - Math.floor(hq * 8 + 1e-6)) & 3; }   // 斗笠被迎面打飞，往身后滚两圈
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.line = 1;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.a = RD(P.a / ASTEP) * ASTEP; P.ai = RD(P.a / ASTEP);
    if (P.two) { const b = parts.onShaft(P, {}, -4); P.bhx = b[0]; P.bhy = b[1]; } else { P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; }
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dqi = RD(P.dq * 48); P.flt = RD(P.flt);
    const R = parts.rig(P, BODY), eye = parts.toSprite(R, R.hx1 - 1, R.ey), cr = parts.toSprite(R, -1, R.yWaist + 3), kp = hookPoint(P.hx, P.hy, P.a, POLE.len);
    P.gx = eye[0] + P.bx; P.gy = eye[1]; P.cx = cr[0] + P.bx; P.cy = cr[1]; P.kx = kp[0] + P.bx; P.ky = kp[1];
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY), sk = M.skin, skD = M.skinD;
    const eye = P.gem >= 4 ? 0 : (P.gem >= 2 || P.glint) ? M.eyeB : M.eyeA;
    if (P.pole) hookPole(E, R, P, Object.assign({}, POLE, { free: 1, at: [-6, -1], a: -HALF }));    // 掉在身后地上的钩竿
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: skD, hand: skD, grip: P.two ? 'none' : 'fist' });   // 灰青尸肤的细胳膊
    parts.legs(E, R, P, { style: 'sandal', mat: sk, matD: skD, boot: M.rope, bootD: M.ropeD });
    strawCoat(E, R, P, { mat: M.straw, hem: -5, flare: 1.5, strap2: M.rope });
    creel(E, R, -3, R.yWaist + 1, 5, 5, { mat: M.basket, fish: P.gem >= 4 ? 0 : P.fish === 2 ? M.fishHot : M.fish, wag: P.fish === 1 });   // 死后魂鱼游走，篓口的鱼尾熄灭
    parts.mantle(E, R, P, { style: 'fur', mat: M.strawM, len: 4 });                                 // 蓑衣披肩（压在脸后面，不盖住下巴）
    turtleShell(E, R, R.sBx - (P.lying ? 8 : 10), R.sBy - 2, { mat: M.shell, w: P.lying ? 6 : 8 });   // 后臂挎的龟壳盾：8×10 竖椭圆，画在披肩之后，背后鼓出一个半圆（伸出披肩 4 格）；扑倒后翻过来压在背上，侧看是 10 长 6 高的圆顶
    parts.head(E, R, P, { mat: sk, face: 'gaunt', eye: eye || sk, eyeStyle: eye ? 'glow' : 'dot', nose: 'small', mouth: 'line', ear: 'none', shade: 3 });
    if (eye && !P.eyes) px(E, R, R.hx1 - 4, R.ey, eye, 2);                                           // 远侧那只魂火眼：1 格、暗一档（檐下两点青光）
    if (P.hatF) { const hp = parts.toSprite(R, R.hx, R.htop); bambooHat(E, R, P, { mat: M.hat, at: [hp[0] + P.hatX, -P.hatY - [0, 5, 2, 4][P.hatR]], rot: P.hatR }); }   // 翻滚时帽子整只留在地面以上
    else bambooHat(E, R, P, { mat: M.hat, off: P.hatO });
    if (!P.pole) {
      if (P.line) { const kp = hookPoint(P.hx, P.hy, P.a, POLE.len), len = P.line === 1 ? 12 + P.flt : 3 + Math.abs(P.flt); bobber(E, R, kp[0], kp[1], len, P.line === 2 ? P.flt : 0, { line: M.fline, red: M.red, white: M.white }); }
      hookPole(E, R, P, POLE);
      if (P.two) parts.hand(E, R, P, { side: 'B', hand: skD });
    }
    parts.arm(E, R, P, { sleeve: 'tight', mat: sk, cuff: M.rope, hand: sk });
  }
  function bakeHero() {
    RIM.rim = P.rim; RIM.flash = P.flash; RIM.dq = P.dq;
    if (P.rs) { RIM.rx = P.cx + hero.ox; RIM.ry = P.cy + hero.oy; } else { RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; }
    bake(hero, RIM);
  }

  // ───── 特效 ─────
  let thrT = 9, lineT = 9, snapT = 9, fishT = 9, dfT = 9, chargeAcc = 0, soulAcc = 0, emberAcc = 0, lastStep = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const FLOAT_X = DUMMY_X, FLOAT_Y = HY - 33;                          // 技能：浮漂落在假人头顶
  function floatPos(tq) {                                              // 蓄力里浮漂的位置（抛出 0.25–0.45 s 飞过去，之后停在假人头顶点三下）
    const kx = wx(P.kx), ky = wy(P.ky);
    if (tq < 0.25) return null;
    if (tq < 0.45) { const q = (tq - 0.25) / 0.2; return [RD(kx + (FLOAT_X - kx) * q), RD(ky + (FLOAT_Y - ky) * q - 10 * 4 * q * (1 - q))]; }
    const dip = (tq >= 0.7 && tq < 0.78) || (tq >= 0.9 && tq < 0.98) || (tq >= 1.1 && tq < 1.18) ? 1 : 0;
    return [FLOAT_X, FLOAT_Y + dip];
  }
  function drawFloat(x, y) { put(x, y, 12); put(x + 1, y, 11); put(x, y + 1, 21); put(x + 1, y + 1, 17); put(x, y + 2, 17); put(x + 1, y + 2, 18); put(x - 1, y + 1, 0); put(x + 2, y + 1, 0); }
  function dashLine(x0, y0, x1, y1, sag, f12, c1, c2) {                // 鱼线：连续取样的虚线（亮 3 格断 1 格，逐帧往前走），中段下垂 sag 格
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5)); let lx = 1e9, ly = 1e9, k = 0;
    for (let s = 0; s <= n; s++) {
      const q = s / n, x = RD(x0 + (x1 - x0) * q), y = RD(y0 + (y1 - y0) * q + sag * 4 * q * (1 - q)); if (x === lx && y === ly) continue;
      lx = x; ly = y; const m = (k++ + f12) % 4; if (m) put(x, y, m === 2 ? c2 : c1);
    }
  }
  // 魂鱼（特效外形）：身长 6，横着朝运动方向；头白、身青、腹一排暗一级、背鳍 1 格、尾分叉，斜着飞时尾巴抬 / 压 1 格；外面一圈墨色勾线（夜空里看得清）。fade 0–1 抖动消失
  const FISH = [[0, 0, 0], [1, 0, 1], [2, 0, 1], [3, 0, 1], [4, 0, 2], [1, 1, 2], [2, 1, 2], [3, 1, 3], [2, -1, 1], [5, -1, 3], [5, 1, 3]];
  function drawFish(x, y, vx, vy, R, fade) {
    const d = vx < 0 ? -1 : 1, tilt = Math.abs(vy) > Math.abs(vx) * 0.6 ? Math.sign(vy) : 0;
    const at = (k, j) => [RD(x - d * k), RD(y + j - (k >= 3 ? tilt : 0))], gone = (p, k) => fade && hash(p[0] * 3 + k, p[1]) < fade;
    for (const [k, j] of FISH) { const p = at(k, j); if (!gone(p, k)) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(p[0] + dx, p[1] + dy, 0); }
    for (const [k, j, c] of FISH) { const p = at(k, j); if (!gone(p, k)) put(p[0], p[1], R[c]); }
  }
  function onEnter(s) {
    if (s !== CAST) return;                                            // 扬竿：鱼线绷紧一下，魂鱼从假人身上被拽出来
    snapT = 0; fishT = 0; lineT = 9;
    releaseOrbit(30, 70, 0.3, 0.6, { pts: 1 }); burst(FLOAT_X, FLOAT_Y + 8, 14, 30, 80, 0.25, 0.5, R_EL, 10);
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_REACH) { thrT = 0; sfx('swing', { kind: 'thrust', w: 0.35 }); }
    if (s === ATTACK && t === T_YANK) {                                // 钩中回拽：从前往后的拖影弧 + 火花，假人被往回拽
      fx.slash(wx(K_YANK.hx + 1), wy(K_YANK.hy), 16, K_REACH.a + 0.05, K_YANK.a - 0.1, R_ST, 0.17, 2, 2);
      burst(DUMMY_X - 1, HY - 16, 10, 40, 100, 0.15, 0.35, R_IMP, 10); fx.cross(DUMMY_X - 1, HY - 16, 4, R_IMP, 0.2);
      sfx('hit', { mat: 'flesh', w: 0.35 });
    }
    if (s === ATTACK && t === T_JERK) hitDummy(0, -1);                 // 假人晚 1 帧闪白、往回摇：回拽那一帧的拖影弧落在没闪白的假人身上，看得清
    if (s === CHARGE && Math.abs(t - 0.25) < 1e-9) { lineT = 0; sfx('shoot', { proj: 'water' }); }   // 抛出浮漂
    if (s === CAST && t === T_ARRIVE) {                                // 魂鱼钻进鱼篓：鱼篓爆亮、冲击环、脚下魂光上飘（成长）
      const cx = wx(P.cx), cy = wy(P.cy);
      ring(cx, cy, 0, R_EL); burst(cx, cy, 14, 30, 90, 0.2, 0.5, R_EL, 14); fx.cross(cx, cy - 1, 4, R_EL, 0.2);
      for (let i = 0; i < 12; i++) spawn(K_RISE, wx(-6 + Math.random() * 12), HY - Math.random() * 2, (Math.random() - 0.5) * 6, -16 - Math.random() * 16, 0.6 + Math.random() * 0.5, R_EL);
      hitDummy(0, -1); shake(0.12, 1); sfx('impact', { pal: 'water', w: 0.5 });
    }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) { for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 8 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.45 }); }
    if (s === DEATH && Math.abs(t - T_FISH) < 1e-9) dfT = 0;
  }
  const EVENTS = [[], [], [T_REACH, T_YANK, T_JERK], [0.25], [T_ARRIVE], [], [], [T_LAND, T_FISH], []];
  function hurtFx(s) {                                                 // 亡灵：骨灰火花 + 少量魂光
    const hx = HX + 1, hy = HY - 13; burst(hx, hy, s === DEATH ? 20 : 12, 40, 110, 0.25, 0.5, FXI.dust, 16); burst(hx, hy, s === DEATH ? 8 : 4, 20, 60, 0.3, 0.6, R_EL, 8);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT >= 0.45) {                              // 魂光从假人身上螺旋汇聚到浮漂
      chargeAcc += dt * (14 + 22 * clamp01((stT - 0.45) / 0.95));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = 0.25 + Math.random() * (Math.PI - 0.5), r = 9 + Math.random() * 10; spawn(K_SPIRAL_PT, FLOAT_X + 1, FLOAT_Y + 1, r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, (Math.random() - 0.5) * 5); }
    }
    if (state === CAST && fishT < FLY && ((E.stepN & 1) === 0)) { const p = fishAt(fishT); spawn(K_TRAIL, p[0] + 2, p[1], 10 + Math.random() * 10, (Math.random() - 0.5) * 8, 0.2 + Math.random() * 0.15, R_EL); }
    if (state === IDLE) { emberAcc += dt * 1.4; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, wx(P.cx) + (Math.random() - 0.5) * 2, wy(P.cy) - 4, (Math.random() - 0.5) * 6, -6 - Math.random() * 6, 0.5 + Math.random() * 0.4, R_EL); } }
    if (state === MOVE && P.step !== lastStep) {                       // 拖步：落脚 1 颗尘，竿尾点地再 1 颗
      if (P.step !== 0) { sfx('step', { w: 0.3 }); spawn(K_DUST, wx(P.step > 0 ? 3 : -3), HY, (Math.random() - 0.5) * 14, -4 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust); spawn(K_DUST, wx(P.hx + 1 + P.bx), HY, (Math.random() - 0.5) * 10, -5 - Math.random() * 5, 0.3, FXI.dust); }
      lastStep = P.step;
    }
    if (state === DEATH && dfT < 0.9 && ((E.stepN % 3) === 0)) for (let k = 0; k < 2; k++) { const p = deathFishAt(k, dfT); spawn(K_RISE, p[0], p[1], (Math.random() - 0.5) * 4, -6 - Math.random() * 6, 0.4 + Math.random() * 0.3, R_EL); }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 6 + Math.random() * 22, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    thrT += dt; lineT += dt; snapT += dt; fishT += dt; dfT += dt;
  }
  function fishAt(t) {                                                 // 施放：魂鱼沿抛物线从假人甩回鱼篓
    const q = clamp01(t / FLY), x0 = DUMMY_X - 2, y0 = HY - 18, x1 = wx(P.cx), y1 = wy(P.cy) - 2;
    return [x0 + (x1 - x0) * q, y0 + (y1 - y0) * q - 16 * 4 * q * (1 - q), (x1 - x0), (y1 - y0) - 16 * 4 * (1 - 2 * q)];
  }
  function deathFishAt(k, t) {                                         // 死亡：鱼篓里游出 2 条魂鱼，绕一圈后上升
    const cx = wx(P.cx), cy = wy(P.cy) - 3 - t * 8, th = k * Math.PI + (t / 0.55) * 2 * Math.PI;
    if (t < 0.55) return [cx + Math.cos(th) * 7, cy + Math.sin(th) * 3, -Math.sin(th) * 7, Math.cos(th) * 3];
    return [cx + Math.cos(th) * 7 * (1 - (t - 0.55) * 2), cy - (t - 0.55) * 30, 0, -1];
  }
  function fxReset() { thrT = 9; lineT = 9; snapT = 9; fishT = 9; dfT = 9; chargeAcc = 0; soulAcc = 0; emberAcc = 0; lastStep = 0; }
  function fxBack(f12) { if (!P.lying && P.rim >= 2) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    const st = E.state, stT = E.stT;
    if (thrT < 1 / 12) {                                               // 前探：沿竿两道速度线
      const kx = wx(P.kx), ky = wy(P.ky), d = P.flip ? 1 : -1; for (let k = 3; k <= 9; k++) { put(kx + d * k, ky - 2, k < 6 ? 31 : 30); if (k > 4) put(kx + d * k, ky + 6, 30); }
    }
    if (st === CHARGE && stT >= 0.25) {                                // 抛出的鱼线 + 浮漂
      const fp = floatPos(q12(stT)); if (fp) { dashLine(wx(P.kx), wy(P.ky), fp[0], fp[1], stT < 0.45 ? 0 : 2, f12, EL[0], 21); drawFloat(fp[0], fp[1]); }   // 魂青虚线（每段中间一格白），中段垂 2 格，整条在假人头顶上方的夜空里
    }
    if (snapT < 2 / 12) { const c = snapT < 1 / 12 ? EL[0] : EL[1]; dashLine(wx(P.kx), wy(P.ky), FLOAT_X, FLOAT_Y + 6, 0, 0, c, c); }   // 鱼线绷紧「嗖—啪」
    if (st === CAST && fishT < FLY) { const p = fishAt(fishT); drawFish(RD(p[0]), RD(p[1]), p[2], p[3], EL, 0); }
    if (st === DEATH && dfT < 0.9) for (let k = 0; k < 2; k++) { const p = deathFishAt(k, dfT); drawFish(RD(p[0]), RD(p[1]), p[2], p[3], EL, clamp01((dfT - 0.55) / 0.35)); }
  }

  return {
    name: '步卒', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eyeA, M.eyeB, M.fish, M.fishHot], HIT_POINT: [2, -13], EVENTS,
    SFX: { body: 'flesh', how: 'topple', pal: 'water', style: 'spiral', w: 0.4 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
