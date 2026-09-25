// 赤蠕虫（部队 · 兽人 · 商人 · 普通）：贴地的赤红环节软身、前段竖起一张满圈白牙的大圆口 + 两根短触须、背上捆一只鼓鼓的麻布钱袋（袋口打结翘起、缝里露金币）、
// 背上一排金色脂肪斑（「美味」：越胖越值钱）、尾尖一小簇绒毛。攻击 = 后缩蓄势、弹射前扑一口咬住；技能 = 特性「美味」生效的样子：
// 把自己吃得鼓鼓的，金斑从尾到头逐节亮起，圆口朝天喷出一股金币喷泉，金币砸在假人和地上叮当弹跳，落定后化成积分光点升空；收招泄气、打个嗝。
// 死亡 = 爆裂：猛地鼓胀 → 「噗」地爆开（死亡套件 chunks），钱袋炸开、金币四散弹跳、闪 3 下变成积分光点升空。升级 → 镰刃虫（SickleWorm.js）。
// 身体用 parts-beast 的 serpent 骨架（rig + body）；头（圆口 + 触须）、钱袋、环节细节、弹跳金币是本模块自己画的（见「候选部件」注释）。
PCD.define('RedWorm', (E) => {
  const { Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_EMBER, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, death, hitDummy, put, scrX, floorGlow, shotFloorGlow } = E;
  const B = E.parts.beast, S = B.serpent, U = B.util, R = Math.round;

  // ───── 材质：全部取自共享色板 ─────
  const m = B.mats(E, {
    main: 'blood', belly: 'pink', lip: 'pink', teeth: 'white', gold: 'gold', sack: 'sand', rope: 'leather',
    tuft: [11, 63, 58, 5], throat: [55, 55, 56, 56], glow: [14, 14, 5, 5], spark: [21, 21, 21, 21],
  });
  m.body = E.defMat(E.RAMP.blood, 1);                                                    // 身体只有 7 格高：暗边 1 格，中间留出大片赤红
  m.throat = E.defMat([55, 55, 56, 56], 1, 1);                                              // 喉咙（平涂暗红）
  m.spark = E.defMat([21, 21, 21, 21], 1, 1);                                               // 金斑爆亮（平涂白）
  const R_EL = FXI.coin, EL = FXR[R_EL], R_IMP = FXI.impact, R_FLESH = FXI.blood;           // 元素：美味 · 金币

  // ───── 形体：贴地蠕虫档，身长约 24、竖起约 9 格，半径 3.5 → 1.5；arch 三档（伸长 / 平常 / 拱起）─────
  const BASE = { n: 21, r: 3.5, rTail: 1.5, waves: 1.2, rise: 6, neck: 4, head: 'worm', hl: 5, hh: 6, bands: 0, belly: 0, scales: 0, spikes: 0, m };
  const OS = [0.8, 1.6, 2.6].map((a) => S.shape(Object.assign({}, BASE, { arch: a })));
  const HEAD = { rx: 3.4, ry: 3.8, md: 2.6, antN: 3, antF: 2 };
  const BAND = 4, SACK_X = -5;                                                              // 环节间距（沿脊线弧长）、钱袋在脊线上的位置

  const HX = 67, DUR = DEFAULT_DUR.slice(), hero = new Sprite(84, 44, 38, 40);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['teeth', 'glow', 'spark', 'throat', 'ink', 'gold', 'rope']) RIM.skip[m[k]] = 1;

  // ───── 姿势字段（serpent 的 + 本角色的）─────
  //   arch 拱起档 0–2 · swell 鼓胀 0 无 / 1–4 从尾到头逐段 / 5 全身（死前）· spots 金斑 0 暗 / 1–4 从尾到头亮起 / 5 全亮
  //   aim 圆口朝向 0 前 / 1 斜上 / 2 朝天 · ant 触须 -1 后贴 / 0 / 1 竖起 / 2 前抖 · tailUp 尾巴翘起 0–2 · coin 抛币位置 0 无 / 1 袋口 / 2 半空 / 3 嘴边
  //   sackOpen 袋口张开 · gulp 吞咽鼓包
  const MINE = [['arch', 0, 2], ['swell', 0, 5], ['spots', 0, 5], ['aim', 0, 2], ['ant', -1, 2], ['tailUp', 0, 2], ['coin', 0, 3], ['sackOpen', 0, 1], ['gulp', 0, 1]];
  const SPEC = S.KEYS.concat(B.COMMON, MINE);
  const P = {};
  function reset() { S.reset(P); P.gf = 1; P.arch = 1; P.swell = 0; P.spots = 0; P.aim = 0; P.ant = 0; P.tailUp = 0; P.coin = 0; P.sackOpen = 0; P.gulp = 0; P.gx = 0; P.gy = 0; }
  reset();
  let rig = null, mouth = [0, 0], sackTop = [0, 0];
  const T_HIT = 2 / 12, T_POP = INCOMING + 0.45, T_THUD = INCOMING + 0.8;
  const AIM = [[1, 0], [0.71, -0.71], [0.2, -0.98]];

  // 抛币个性（1.6–2.0 s，5 帧）：[tailUp, coin, rise, aim, jaw, gulp, spots, ant, sackOpen]
  const TOSS = [[1, 1, 0, 0, 1, 0, 0, 1, 1], [2, 2, 2, 1, 2, 0, 0, 1, 0], [1, 3, 2, 1, 3, 0, 0, 2, 0], [0, 0, 1, 1, 0, 1, 0, 0, 0], [0, 0, 0, 0, 0, 0, 5, 1, 0]];
  function idle(tq, f12) {
    const lp = S.anim.idle(P, tq, f12, DUR[IDLE]); P.tongue = 0;
    const b = Math.floor((f12 / 12) * 2.5 + 1e-6); P.arch = b & 1 ? 1 : 0; P.ant = b & 1 ? 0 : 1;   // 身体波纹：背中间的拱峰一起一伏，触须跟着点
    if (lp >= 1.6 - 1e-6 && lp < 2.0) {
      const k = Math.min(4, f12of(lp - 1.6)), s = TOSS[k];
      P.tailUp = s[0]; P.coin = s[1]; P.rise = s[2]; P.aim = s[3]; P.jaw = s[4]; P.gulp = s[5]; P.spots = s[6]; P.ant = s[7]; P.sackOpen = s[8];
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                // 尺蠖式蠕动：拱峰随步态往前推，前段一伸一缩
      S.anim.walk(P, tq); P.arch = 2; P.ant = [0, 1, 0, -1][P.gf];
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { const q = ease.out(tq / 0.12); P.rise = R(2 * q); P.bx = -R(q); P.jaw = 1; P.arch = 2; P.ant = -1; }       // 后缩蓄势
      else if (tq < 0.25) { P.bx = 3; P.strike = 4; P.rise = -2; P.jaw = 3; P.arch = 0; P.ant = 2; }                // 弹射前扑，圆口张到最大
      else if (tq < 0.45) { P.bx = 3; P.strike = 3; P.rise = -1; P.jaw = 0; P.arch = 0; P.ant = 2; }                          // 一口咬住
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); P.bx = R(3 * (1 - q)); P.strike = R(3 * (1 - q)); P.rise = -R(1 - q); P.arch = q < 0.5 ? 0 : 1; }
    } else if (st === CHARGE) {                                            // 前段高高竖起，一节节鼓胀，金斑从尾到头亮起
      const q = ease.inOut(clamp01(tq / 0.7));
      P.rise = R(4 * q); P.aim = tq < 0.5 ? 0 : 1; P.jaw = tq < 1.1 ? 1 : 2; P.rim = 2; P.arch = 1;
      P.swell = tq < 0.2 ? 0 : Math.min(4, Math.floor((tq - 0.2) / 0.25) + 1); P.spots = P.swell;
      if (tq > 1.1) { P.spots = (f12 & 1) ? 5 : 4; P.ant = (f12 & 1) ? 1 : 2; }
      P.sackOpen = tq >= 0.4 ? 1 : 0;
    } else if (st === CAST) {                                              // 圆口朝天张到最大（定格 1 帧），喷出金币喷泉
      P.aim = 2; P.jaw = 3; P.rise = tq < T_HIT ? 6 : 5; P.swell = 4; P.spots = 5; P.rim = 3; P.ant = -1; P.sackOpen = 1; P.arch = 1;
    } else if (st === RECOVER) {                                           // 泄气缩回原来粗细，打一个嗝
      const q = ease.inOut(clamp01(tq / 0.6));
      P.rise = R(5 * (1 - q)); P.swell = Math.max(0, 4 - Math.floor(tq / 0.07)); P.spots = tq < 0.2 ? 4 : 0;
      P.aim = tq < 0.2 ? 2 : tq < 0.4 ? 1 : 0; P.jaw = tq >= 0.33 && tq < 0.42 ? 2 : tq < 0.2 ? 1 : 0; P.gulp = tq >= 0.25 && tq < 0.33 ? 1 : 0;
      P.rim = q < 0.5 ? 2 : q < 0.8 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.rise = 2; P.jaw = 2; P.ant = -1; P.tailUp = 1; P.sackOpen = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { P.bx = -1; P.rise = 1; P.jaw = 1; P.ant = -1; }
      else { const q = ease.inOut(clamp01((h - 0.35) / 0.15)); P.rise = R(1 - q); }
    } else if (st === DEATH) {                                             // 爆裂：受击 → 猛地鼓胀（肉褶撑开、金斑全亮）→ 噗地爆开
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.12) { P.bx = -2; P.rise = 2; P.jaw = 2; P.ant = -1; P.tailUp = 1; P.flash = d < 1 / 12 ? 1 : 0; }
      else if (d < 0.28) { P.bx = -2; P.rise = 1; P.jaw = 1; P.ant = -1; P.swell = 4; P.spots = 4; P.sackOpen = 1; }
      else if (d < 0.45) { P.bx = (f12 & 1) ? -1 : -2; P.rise = 2; P.jaw = 3; P.aim = 1; P.ant = 2; P.swell = 5; P.spots = 5; P.sackOpen = 1; P.tailUp = 1; }
      else P.dq = 1;                                                       // 之后由死亡套件（碎肉块）和金币接管
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = S.rig(P, OS[P.arch]); reshape(rig);
    P.gx = R(mouth[0]) + P.bx; P.gy = R(mouth[1]);
    B.key(P, SPEC);
  }

  // rig 的后处理（纯函数式：只改这次 rig 的数组）：尾巴翘起、鼓胀（半径 +1，圆心跟着抬高）、脊线弧长 / 法线，圆口和钱袋的挂点
  function reshape(g) {
    const p = g.pts, n = p.length / 3;
    if (P.tailUp) for (let k = 0; k < 7; k++) { const t = 1 - k / 7; p[3 * k] += P.tailUp * 1.3 * t * t; p[3 * k + 1] -= P.tailUp * 2.4 * Math.pow(t, 1.4); }
    g.dr = new Float32Array(n);
    if (P.swell) for (let k = 0; k < n; k++) { const s = k / (n - 1), dr = P.swell >= 5 ? 1.6 : s <= P.swell / 4 + 0.02 ? 1 : 0; g.dr[k] = dr; p[3 * k + 2] += dr; p[3 * k + 1] -= dr; }
    const hd = P.swell >= 5 ? 1.6 : P.swell >= 4 ? 1 : 0; g.head = { x: g.head.x, y: g.head.y - hd, a: g.head.a };
    g.len = new Float32Array(n); g.nx = new Float32Array(n); g.ny = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      if (k) g.len[k] = g.len[k - 1] + Math.hypot(p[3 * k] - p[3 * k - 3], p[3 * k + 1] - p[3 * k - 2]);
      const a = Math.max(0, k - 1), b = Math.min(n - 1, k + 1); let tx = p[3 * b] - p[3 * a], ty = p[3 * b + 1] - p[3 * a + 1]; const l = Math.hypot(tx, ty) || 1;
      g.nx[k] = ty / l; g.ny[k] = -tx / l;                                  // 背侧法线（贴地段朝上，竖起段朝后）
    }
    let ks = 0; for (let k = 0; k < n; k++) if (p[3 * k] <= SACK_X) ks = k; g.kSack = ks;
    const d = AIM[P.aim]; mouth = [g.head.x + d[0] * HEAD.md, g.head.y + d[1] * HEAD.md];
    sackTop = [p[3 * ks], p[3 * ks + 1] - p[3 * ks + 2] - 5];
  }

  // ───── 画（从后往前：身体 → 钱袋 → 头 → 抛起的金币）─────
  // 身体：serpent.body 画脊线圆盘（一个部件），紧跟着画本角色的细节（同一个部件，没有分界线）：浅粉腹线、环节肉褶、金色脂肪斑、吞咽鼓包、尾尖绒毛
  function drawBody() {
    const o = OS[P.arch], p = rig.pts, n = p.length / 3;
    S.body(E, rig, P, o);
    if (P.gulp) { const k = n - 5; U.disc(E, p[3 * k], p[3 * k + 1], p[3 * k + 2] + 1, m.body, 0); }
    const full = P.swell >= 5, lit = P.spots, nSeg = Math.floor(rig.len[n - 1] / BAND) + 1;
    for (let k = 0; k < n; k++) {
      const x = p[3 * k], y = p[3 * k + 1], r = p[3 * k + 2], nx = rig.nx[k], ny = rig.ny[k];
      if (r >= 1.2) U.dot(E, x - nx * (r - 0.4), y - ny * (r - 0.4), m.belly, 0);                              // 浅粉腹线
      const L = rig.len[k], seg = Math.floor(L / BAND), ph = L - seg * BAND;
      if (k > 0 && ph < rig.len[k] - rig.len[k - 1] && r >= 1.5 && k < n - 3) {                                // 环节肉褶：背侧一道暗褶，腹侧露出浅粉
        for (let q = -1; q <= 1.001; q += 1 / Math.max(2, r)) {
          const j = q * (r - 0.7), xx = x + nx * j, yy = y + ny * j;
          if (full || rig.dr[k] > 0 && q < 0.2) U.dot(E, xx, yy, m.lip, 0); else if (q > -0.35) U.dot(E, xx, yy, m.body, 2); else U.dot(E, xx, yy, m.lip, 0);
        }
      }
      if (ph >= 1.6 && ph < 1.6 + (rig.len[k] - (k ? rig.len[k - 1] : 0) || 1) && r >= 1.8 && k < n - 3) {        // 金色脂肪斑：每节背上一块，亮起时用平涂亮金
        const on = full || lit >= 5 || (lit > 0 && seg < nSeg * lit / 4), mat = full || lit >= 5 ? (seg & 1 ? m.spark : m.glow) : on ? m.glow : m.gold;
        const sx = x + nx * (r - 1.4), sy = y + ny * (r - 1.4);
        U.dot(E, sx, sy, mat, on ? 0 : 4); U.dot(E, sx + ny, sy - nx, mat, on ? 0 : 3);
        if (r >= 3) U.dot(E, sx - ny, sy + nx, mat, on ? 0 : 3);
      }
    }
    const tx = p[0], ty = p[1], ux = p[3] - p[0], uy = p[4] - p[1], ul = Math.hypot(ux, uy) || 1;             // 尾尖绒毛：顺着尾巴往后翘的一小簇
    const bx = -ux / ul, by = -uy / ul;
    U.dot(E, tx + bx, ty + by, m.tuft, 3); U.dot(E, tx + bx * 2 - by * 0.6, ty + by * 2 + bx * 0.6 - 1, m.tuft, 4); U.dot(E, tx + bx * 2, ty + by * 2 + 1, m.tuft, 2);
  }
  // 候选部件：serpentPack（背在蠕虫背上的麻布袋：鼓肚 + 补丁 / 缝线 + 扎口绳结 + 翘起的袋口 + 缝里露出的金币；big 1 = 镰刃虫的大宝袋）
  function drawSack() {
    part();
    const p = rig.pts, k = rig.kSack, x = p[3 * k], y = p[3 * k + 1], r = p[3 * k + 2];
    const sx = R(x), sy = R(y - r - 1.4), op = P.sackOpen;
    U.oval(E, sx, sy, 3.4, 2.5, m.sack, 0);                                                                   // 鼓肚
    U.dot(E, sx - 2, sy + 1, m.sack, 2); U.dot(E, sx - 1, sy + 1, m.sack, 2);                                 // 补丁（暗一格）
    U.dot(E, sx + 1, sy - 1, m.sack, 2); U.dot(E, sx + 1, sy + 1, m.sack, 2);                                 // 缝线
    U.dot(E, sx + 3, sy, m.gold, 4); U.dot(E, sx + 3, sy + 1, m.gold, 3);                                     // 缝里露出的金币
    U.dot(E, sx - 1, sy - 3, m.rope, 3); U.dot(E, sx, sy - 3, m.rope, 4); U.dot(E, sx + 1, sy - 3, m.rope, 3); U.dot(E, sx + 2, sy - 2, m.rope, 2);   // 绳结 + 垂下的绳头
    const w = op ? 1 : 0;                                                                                     // 袋口：扎口上面的麻布翘起 2–3 格，张开时往两边翻
    U.dot(E, sx - 1 - w, sy - 4, m.sack, 4); U.dot(E, sx, sy - 4, op ? m.gold : m.sack, op ? 4 : 3); U.dot(E, sx + 1 + w, sy - 4, m.sack, 3);
    U.dot(E, sx - 2 - w, sy - 5, m.sack, 4); U.dot(E, sx, sy - 5, m.sack, op ? 0 : 4); U.dot(E, sx + 2 + w, sy - 5, m.sack, 3);
    if (op) U.dot(E, sx - 1, sy - 4, m.gold, 3);                                                              // 张开的袋口里露出金币
  }
  // 候选部件：wormMaw（蠕虫圆口头：正对前方的圆口 = 粉唇 + 一圈白牙 + 深喉，张开时唇瓣像花一样外翻；圆口可朝前 / 斜上 / 朝天；头顶两根触须）
  function drawHead() {
    part();
    const H = rig.head, hx = H.x, hy = H.y, j = P.jaw | 0, d = AIM[P.aim], px = -d[1], py = d[0];
    U.oval(E, hx, hy, HEAD.rx, HEAD.ry, m.limb, 0);
    const AD = { '-1': [[-1, -0.4], [-1, 0.2]], 0: [[0.5, -1], [1, -0.5]], 1: [[0.3, -1], [0.3, -1]], 2: [[1, -0.8], [1, 0]] }[P.ant];   // 触须（两节）：后贴 / 平常 / 竖起 / 前抖
    const ant = (bx, by, L, tone) => { let x = bx, y = by; for (let i = 0; i < L; i++) { const a = AD[i < L / 2 ? 0 : 1]; x += a[0]; y += a[1]; U.dot(E, x, y, i === L - 1 ? m.lip : m.limb, i === L - 1 ? 4 : tone); } };
    ant(hx - 1, hy - HEAD.ry + 1, HEAD.antF, 2);
    ant(hx + 0.6, hy - HEAD.ry + 0.6, HEAD.antN, 4);
    const Mx = R(hx + d[0] * HEAD.md), My = R(hy + d[1] * HEAD.md), au = 1.35 + 0.35 * j, av = 2.5 + 0.35 * j, inner = 0.2 + 0.1 * j;
    for (let y = My - 7; y <= My + 7; y++) for (let x = Mx - 7; x <= Mx + 7; x++) {                        // 圆口：深喉 → 一圈白牙（隔一颗露出暗红牙缝）→ 粉唇
      const u = (x - Mx) * d[0] + (y - My) * d[1], v = (x - Mx) * px + (y - My) * py, e = (u / au) ** 2 + (v / av) ** 2;
      if (e > 1) continue;
      if (e <= inner) U.dot(E, x, y, m.ink, 0);
      else if (e <= 0.64) { const g = Math.floor((Math.atan2(v, u) / (2 * Math.PI) + 1) * 12) & 1; U.dot(E, x, y, g ? m.throat : m.teeth, 0); }   // 牙一颗隔一颗
      else U.dot(E, x, y, m.lip, 0);
    }
    if (j >= 2) for (const a of [-1.4, -0.7, 0, 0.7, 1.4]) {                                                 // 张大时唇瓣像花一样外翻，瓣尖是牙
      const cu = Math.cos(a), sv = Math.sin(a), L = j - 1;
      for (let s = 1; s <= L; s++) { const u = (au + s) * cu, v = (av + s) * sv; U.dot(E, Mx + u * d[0] + v * px, My + u * d[1] + v * py, s === L ? m.teeth : m.lip, s === L ? 0 : 4); }
    }
  }
  function drawCoin() {                                                    // 抛币个性里那枚金币（一个部件）
    if (!P.coin) return; part();
    const p = rig.pts, k = rig.kSack, sx = p[3 * k], sy = p[3 * k + 1] - p[3 * k + 2] - 6;
    const at = P.coin === 1 ? [sx, sy] : P.coin === 2 ? [(sx + mouth[0]) / 2 + 1, Math.min(sy, mouth[1]) - 6] : [mouth[0] + 1, mouth[1] - 2];
    const x = R(at[0]), y = R(at[1]); U.dot(E, x, y, m.gold, 4); U.dot(E, x + 1, y, m.gold, 3); U.dot(E, x, y + 1, m.gold, 3); U.dot(E, x + 1, y + 1, m.gold, 2);
  }
  function drawHero() { begin(hero, P.bx, 0); drawBody(); drawSack(); drawHead(); drawCoin(); }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  // 候选积木：coinRain（弹跳翻面的金币：飞行时 2×2 正面 / 1×2 侧面交替、翻到侧面那一帧闪白；落地弹 2 次后躺平，技能里立刻化成积分光点升空，死亡里先闪 3 下）
  const CN = 24, cOn = new Uint8Array(CN), cX = new Float32Array(CN), cY = new Float32Array(CN), cVX = new Float32Array(CN), cVY = new Float32Array(CN), cAge = new Float32Array(CN), cB = new Uint8Array(CN), cRest = new Float32Array(CN), cMode = new Uint8Array(CN), cHitD = new Uint8Array(CN);
  const GROUND = HY - 1, G = 300;
  function coinLaunch(x, y, vx, vy, mode) { let i = 0; for (; i < CN - 1 && cOn[i]; i++); cOn[i] = 1; cX[i] = x; cY[i] = y; cVX[i] = vx; cVY[i] = vy; cAge[i] = 0; cB[i] = 0; cRest[i] = -1; cMode[i] = mode; cHitD[i] = 0; }
  function coinStep(dt) {
    for (let i = 0; i < CN; i++) {
      if (!cOn[i]) continue; cAge[i] += dt;
      if (cRest[i] >= 0) {
        cRest[i] += dt; const wait = cMode[i] ? 0.5 : 0.12;
        if (cRest[i] >= wait) { cOn[i] = 0; spawn(K_RISE, cX[i] + 1, cY[i], 0, -26 - Math.random() * 10, 0.7 + Math.random() * 0.3, R_EL); spawn(K_EMBER, cX[i], cY[i] - 1, 0, -12, 0.3, R_EL); }
        continue;
      }
      cVY[i] += G * dt; cX[i] += cVX[i] * dt; cY[i] += cVY[i] * dt;
      if (!cHitD[i] && cVX[i] > 0 && Math.abs(cX[i] + 1 - DUMMY_X) <= 5 && cY[i] > HY - 28 && cY[i] < HY - 3) {   // 砸在假人身上：叮一声弹回来
        cHitD[i] = 1; cVX[i] = -cVX[i] * 0.3 - 6; cVY[i] *= 0.5; burst(cX[i] + 1, cY[i], 3, 20, 50, 0.1, 0.25, R_EL, 6);
      }
      if (cY[i] >= GROUND && cVY[i] > 0) {
        cY[i] = GROUND;
        if (cB[i] < 2) { cVY[i] = -cVY[i] * (cB[i] ? 0.3 : 0.45); cVX[i] *= 0.6; cB[i]++; put(R(cX[i]), HY, EL[1]); }
        else { cVX[i] = 0; cVY[i] = 0; cRest[i] = 0; cY[i] = HY; }
      }
    }
  }
  function coinDraw(f12) {
    for (let i = 0; i < CN; i++) {
      if (!cOn[i]) continue; const x = R(cX[i]), y = R(cY[i]);
      if (cRest[i] >= 0) { if (cMode[i] && (Math.floor(cRest[i] * 12) % 2)) continue; put(x, y, EL[2]); put(x + 1, y, EL[1]); continue; }   // 躺平：2×1；死亡里闪 3 下
      const ph = Math.floor(cAge[i] * 16 + i) & 3;
      if (ph === 0) { put(x, y, EL[1]); put(x + 1, y, EL[2]); put(x, y + 1, EL[2]); put(x + 1, y + 1, EL[3]); }
      else if (ph === 2) { put(x, y, EL[2]); put(x + 1, y, EL[2]); put(x, y + 1, EL[3]); put(x + 1, y + 1, EL[3]); }
      else { const c = ph === 1 ? EL[0] : EL[3]; put(x, y, c); put(x, y + 1, c); }                          // 翻到侧面：1×2，一次闪白
    }
  }
  let chargeAcc = 0, hopAcc = 0, soulAcc = 0, lastGf = -9, biteT = 9, biteX = 0, biteY = 0, starT = 9;
  const mouthScr = () => [scrX(P.gx), HY + P.gy];
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [gx, gy] = mouthScr();
      releaseOrbit(30, 70, 0.25, 0.5, { up: 30 });
      for (let i = 0; i < 18; i++) coinLaunch(gx - 1 + Math.random() * 2, gy - 2, 10 + Math.random() * 32, -58 - Math.random() * 30, 0);   // 金币喷泉
      burst(gx, gy - 3, 10, 30, 80, 0.2, 0.45, R_EL, 30); fx.cross(gx, gy - 5, 5, R_EL, 0.25); ring(gx, gy - 1, 1, R_EL);
      shake(0.28, 2); flash(0.05); starT = 0;
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                     // 弹射前扑：圆口咬合拖影 + 命中火花
      const [gx, gy] = mouthScr(); biteT = 0; biteX = gx; biteY = gy;
      burst(DUMMY_X - 4, gy, 10, 40, 90, 0.15, 0.35, R_IMP, 8); burst(DUMMY_X - 4, gy, 4, 20, 50, 0.2, 0.4, R_FLESH, 4); hitDummy(0, 1);
      for (let i = 0; i < 3; i++) spawn(K_DUST, scrX(-10) + Math.random() * 6, HY, -10 - Math.random() * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust);
      sfx('swing', { kind: 'bite', w: 0.3 }); sfx('hit', { mat: 'flesh', w: 0.3 });
    }
    if (s === CAST && Math.abs(t - 0.35) < 1e-9) { hitDummy(0, 1); shake(0.12, 1); burst(DUMMY_X, HY - 16, 8, 30, 70, 0.15, 0.35, R_EL, 8); sfx('impact', { pal: 'coin', w: 0.4 }); }   // 金币砸中假人
    if (s === RECOVER && Math.abs(t - 0.33) < 1e-9) { const [gx, gy] = mouthScr(); spawn(K_RISE, gx, gy - 2, 0, -18, 0.7, R_EL); fx.cross(gx, gy - 2, 2, R_EL, 0.2); }   // 打嗝冒 1 颗金光
    if (s === HURT && Math.abs(t - INCOMING) < 1e-9) for (let i = 0; i < 2; i++) spawnX(K_PHYS, scrX(sackTop[0]) + i, HY + sackTop[1], (Math.random() - 0.5) * 20, -50 - Math.random() * 20, 0.5, R_EL, { g: 280, floor: HY });   // 钱袋里蹦出两点金光
    if (s === DEATH && Math.abs(t - T_POP) < 1e-9) {                        // 「噗」：爆成碎肉块，钱袋炸开、金币四散
      poseAt(DEATH, T_POP - 1 / 12, E.simT); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      const sx = scrX(sackTop[0]), sy = HY + sackTop[1] + 3, cx = scrX(-2);
      death.start('chunks', { chunk: 5, power: 0.24, fromX: -3, fromY: -2, fadeAt: 1.2, fadeDur: 0.5 });
      for (let i = 0; i < 14; i++) coinLaunch(sx - 2 + Math.random() * 4, sy, (Math.random() - 0.5) * 80, -55 - Math.random() * 50, 1);
      burst(cx, HY - 6, 18, 40, 110, 0.2, 0.5, R_FLESH, 14); burst(sx, sy, 10, 30, 80, 0.2, 0.45, R_EL, 18); ring(cx, HY - 6, 0, R_EL);
      shake(0.2, 2); flash(0.04); sfx('hit', { mat: 'flesh', w: 0.5 }); sfx('shoot', { proj: 'coin' });
    }
    if (s === DEATH && Math.abs(t - T_THUD) < 1e-9) sfx('fall', { w: 0.2 });   // 碎块落地
  }
  const EVENTS = [[], [], [T_HIT], [], [0.35], [0.33], [INCOMING], [T_POP, T_THUD], []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = mouthScr();
    if (state === CHARGE) {
      chargeAcc += dt * (14 + 22 * clamp01(stT / DUR[CHARGE]));             // 金色小光点汇聚到圆口
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 10 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
      if (stT >= 0.4) { hopAcc += dt * 7; while (hopAcc >= 1) { hopAcc -= 1; const x = scrX(sackTop[0]) + R(Math.random() * 3 - 1), y = HY + sackTop[1] + 1; spawnX(K_PHYS, x, y, 0, -38 - Math.random() * 18, 0.4, R_EL, { g: 300, floor: y }); } }   // 袋口金币叮当蹦
    }
    if (state === MOVE && P.gf !== lastGf) {                                // 每 2 帧 1 颗尘土，接触帧（0 / 2）发 step
      spawn(K_DUST, scrX(P.gf & 1 ? -12 : 2) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust);
      if (P.gf === 0 || P.gf === 2) sfx('step', { w: 0.2 });
      lastGf = P.gf;
    }
    if (state === IDLE && P.spots >= 5) { hopAcc += dt * 20; while (hopAcc >= 1) { hopAcc -= 1; spawn(K_EMBER, scrX(-4 + Math.random() * 12), HY - 7 - Math.random() * 3, 0, -8, 0.3, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.65 && stT < INCOMING + 2.3) { soulAcc += dt * 14; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 24, HY - 1 - Math.random() * 4, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.6, FXI.soul); } }
    coinStep(dt); biteT += dt; starT += dt;
  }
  function fxReset() { cOn.fill(0); chargeAcc = 0; hopAcc = 0; soulAcc = 0; lastGf = -9; biteT = 9; starT = 9; }
  function fxBack(f12) { if (P.rim >= 2 && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    if (biteT < 2 / 12) {                                                  // 咬合拖影：上下两道弧从张开合拢到圆口前
      const first = biteT < 1 / 12, IR = FXR[R_IMP], d = P.flip ? -1 : 1;
      for (let k = 0; k <= 6; k++) {
        if (!first && (k & 1)) continue; const a = k / 6, dx = R(d * (-3 + a * 6)), dy = R(4.5 * Math.cos(a * Math.PI / 2));
        put(biteX + dx, biteY - dy, first ? IR[0] : IR[2]); put(biteX + dx, biteY + dy, first ? IR[1] : IR[2]);
        if (first) { put(biteX + dx, biteY - dy - 1, IR[1]); put(biteX + dx, biteY + dy + 1, IR[2]); }
      }
    }
    if (E.state === CHARGE && P.spots >= 4 && P.dq < 1) { const [gx, gy] = mouthScr(), L = 2 + (f12 & 1); for (let r = 2; r <= L; r++) { put(gx + r + 1, gy, EL[1]); put(gx - r + 1, gy, EL[2]); put(gx + 1, gy - r, EL[1]); } }   // 圆口前的金色星点
    coinDraw(f12);
  }

  return {
    name: '赤蠕虫', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.glow, m.spark], HIT_POINT: [1, -5], EVENTS,
    deathKit: { mode: 'chunks', at: T_POP },
    SFX: { body: 'flesh', how: 'explode', pal: 'coin', style: 'coin', w: 0.3 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
