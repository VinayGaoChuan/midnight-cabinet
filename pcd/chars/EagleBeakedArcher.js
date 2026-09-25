// 鹰喙弓手（部队 · 僵尸 · 射手 · 普通）：瘦高佝偻的僵尸弓手，头上扣一整只鹰头骨（骨白钩喙前伸 4 格、眼窝一点水青光，喙下露出僵尸的下颌和牙），
// 暗褐乱羽短披肩（背后 3 根长羽翘出轮廓）、背上细箭袋（3 支水刃箭头露在外面）、后手竖握短反曲骨弓、前手拉弦；前臂一道黑线缝合、破靴露出脚趾。
// 攻击 = 竖弓在胸前快速平射一箭，命中后折向斜后方弹射一次；技能 = 特性「水之弹射」生效：蓄满水刃的大箭射中假人（X 形水刃斩）再弹向后方第二个目标。
// 升级线第 1 级 → 投石弓手（CatapultArcher.js）→ 天使弓手（AngelArcher.js）：同一个僵尸，鹰颅盔、钩喙、缝合前臂、乱羽三级共用。
PCD.define('EagleBeakedArcher', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, keyer, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_BURST, K_TRAIL,
    spawn, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, death, sfx } = E;
  const RD = Math.round;

  // ───── 元素：水刃（刀锋）。FXI.water = 白 21 → 青 22 → 蓝 41 → 深蓝 40 → 墨蓝 39 ─────
  const R_EL = FXI.water, EL = FXR[R_EL];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    coat: 'leather', sleeve: 'leather', pants: 'stone', boot: 'boot', belt: 'boot', quiver: 'boot',
    skin: ['#1c2414', '#4a5a36', '#7a8f5c', '#a3b682'],                  // 尸绿灰（僵尸人形共用）
    bone: 'bone', teeth: [8, 18, 17, 21], mantle: 'wood', shaft: 'bone', wrap: 'leather', string: [8, 18, 18, 17],
    glow: { r: [39, 23, 22, 21], flat: 1 }, ink: { r: 'ink', flat: 1 },
  });
  const BODY = { body: 'slim', hunch: 1, headX: -1, leg: 10, torso: 8, head: 6, sw: 3, lift: 1, stride: 3 };
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(66, 48, 32, 42);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 14, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['glow', 'ink', 'string', 'shaft', 'skin', 'teeth']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 拉弦手（hx hy，肘 ex ey 显式给出），后手 = 握弓手（bhx bhy）─────
  const P = { hx: 0, hy: 0, ex: 0, ey: 0, bhx: 0, bhy: 0, pull: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, big: 0, nock: 0, twang: 0, qf: 0, helm: 0, hatX: 0, hatY: 0, hatR: 0, bowF: 0, bowX: 0, bowY: 0, bowR: 0,
    dq: 0, dq48: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, ex, ey, bhx, bhy, pull, lean, head, crouch) => ({ hx, hy, ex, ey, bhx, bhy, pull: pull || 0, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(7, -8, 3, -12, 11, -10);                    // 弓竖在身前（弓梢高过肩），前手垂在弦边
  const K_NOCK = K(5, -16, 0, -12, 11, -14, 1, -1);                // 搭箭、举弓
  const K_DRAW = K(3, -16, -4, -13, 12, -14, 2, -1);               // 拉满（肘在身后）
  const K_REL = K(0, -17, -5, -13, 12, -14, 0);             // 放箭：拉弦手往后弹开
  const K_FOLLOW = K(1, -16, -4, -12, 11, -14, 0);
  const K_CHARGE = K(2, -17, -5, -14, 12, -15, 3, -1);         // 满弓定格
  const K_CAST = K(-1, -18, -6, -14, 13, -15, 0, 0);
  const K_HURT = K(3, -9, 1, -12, 7, -9, 0, -1, -1);
  const K_KNEEL = K(4, -5, 3, -8, 7, -6, 0, 1, 1, 4);
  const FIELDS = ['hx', 'hy', 'ex', 'ey', 'bhx', 'bhy', 'pull', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = keyer([['hx', -16, 15], ['hy', -32, 0], ['ex', -16, 15], ['ey', -32, 0], ['bhx', -16, 20], ['bhy', -32, 0], ['pull', 0, 3], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['big', 0, 1], ['nock', 0, 1], ['twang', 0, 1], ['qf', 0, 3], ['helm', 0, 1], ['hatX', -24, 16], ['hatY', -32, 2], ['hatR', 0, 3], ['bowF', 0, 1], ['bowX', -16, 24], ['bowY', -32, 2], ['bowR', 0, 3],
    ['dq48', 0, 48], ['bx', -16, 15], ['st', 0, 8]]);
  const FEATHER_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], HEAD_SEQ = [0, 1, 1, 0, -1, 0];   // 待机：鹰颅盔每 0.4 s 一顿（前探 / 回收 1 格）
  const T_REL = 2 / 12, T_KIT = INCOMING + 0.36, T_FALL = INCOMING + 0.62;
  const ATK = [[0, K_NOCK], [1 / 12, K_DRAW, 'snap'], [T_REL, K_REL, 'snap'], [0.45, K_FOLLOW, 'out'], [0.75, K_IDLE, 'inOut']];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.big = 0; P.nock = 0; P.twang = 0; P.qf = 0; P.helm = 0; P.hatX = 0; P.hatY = 0; P.hatR = 0; P.bowF = 0; P.bowX = 0; P.bowY = 0; P.bowR = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = FEATHER_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE]; P.head = HEAD_SEQ[Math.floor(lp / 0.4 + 1e-6) % 6];
      if (lp >= 1.6 && lp < 2.0) {                                    // 待机个性：前手指弹一下弓弦（弦抖 1 帧）
        const f = Math.floor((lp - 1.6) * 12 + 1e-6); P.hx += [1, 2, 1, 0, 0][f]; P.hy += [-2, -3, -3, -1, 0][f]; P.ex += [0, 0, 0, 0, 0][f]; P.twang = f === 2 ? 1 : 0; P.glint = f === 2 ? 1 : 0;
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                           // 蹒跚：佝偻前倾，后脚拖地（经过帧只抬 1 格）
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq));
      P.bhx += P.step * 0.6; P.bhy += P.wup ? -1 : 0; P.hx -= P.step * 0.6; P.head = P.wup === 2 ? 1 : 0;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      E.keys(tq, ATK, P, FIELDS); P.nock = tq < T_REL ? 1 : 0;
      if (tq >= T_REL && tq < T_REL + 1 / 12) { P.beard = -2; P.sway = -1; P.glint = 1; }
      else if (tq < T_REL) { P.gem = 1; P.beard = 1; }
    } else if (st === CHARGE) {                                       // 满弓定格：箭头长成弯月水刃
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q); P.nock = P.pull >= 0.5 ? 1 : 0;
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.big = tq >= 0.6 ? 1 : 0; P.rim = 2;
    } else if (st === CAST) { setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.beard = -2; P.sway = -1; P.gem = 3; P.rim = 3; }
    else if (st === RECOVER) {                                        // 收招：弓放下，箭袋里的水刃箭头依次闪一下
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.beard = -RD(1 - q);
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.qf = tq >= 0.15 && tq < 0.5 ? 1 + Math.min(2, Math.floor((tq - 0.15) / (1 / 9) + 1e-6)) : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.gem = 4; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                        // 散架：鹰颅盔先被打飞、骨弓脱手 → 跪塌 → 死亡套件 parts
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) idle();
      else {
        if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; }
        else { setK(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.eyes = 1; P.beard = 1; }
        const hq = clamp01(d / 0.28); P.helm = 1; P.hatX = RD(1 - 14 * hq); P.hatY = RD(-24 + 21 * hq - Math.sin(hq * Math.PI) * 7); P.hatR = hq < 0.35 ? 0 : hq < 0.7 ? 3 : hq < 1 ? 2 : 3;   // 头骨翻滚着飞到身后
        const bq = clamp01((d - 0.06) / 0.22); if (d >= 0.06) { P.bowF = 1; P.bowX = RD(7 + 7 * bq); P.bowY = bq < 0.5 ? RD(-9 + 2 * bq) : RD(-3 - 4 * (1 - bq)); P.bowR = bq < 0.5 ? 0 : 1; }   // 骨弓脱手倒在身前
        P.gem = 4; if (d >= T_KIT - INCOMING) P.dq = 1;              // 之后由死亡套件（散架）接管
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.ex = RD(P.ex); P.ey = RD(P.ey) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.pull = RD(P.pull); P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dq48 = RD(P.dq * 48);
    const f = focus(); P.gx = f[0] + P.bx; P.gy = f[1];
    KEY(P);
  }
  // 发光体：搭着箭时 = 箭头（水刃），放箭后 = 弓前，其余 = 头骨眼窝
  function focus() {
    if (P.nock && !P.bowF) return [P.bhx + (P.big ? 6 : 5), P.bhy + AY];
    if ((P.st === CAST || P.st === RECOVER) && !P.bowF) return [P.bhx + 2, P.bhy + AY];
    const R = parts.rig(P, BODY); return [R.hx + 1, R.ey];
  }

  // ───── 画 ─────
  const px = (T, x, y, m, t) => parts.px(E, T, x, y, m, t);
  const fr = (R, r0, tx, ty) => ({ r0: r0 & 3, tx: R.tx + tx, ty: R.ty + ty, rot: R.rot, ox: R.ox, oy: R.oy });
  const free = (r0, x, y) => ({ r0: r0 & 3, tx: x, ty: y, rot: 0, ox: 0, oy: 0 });
  function sweep2(T, x0, y0, x1, y1, m, t) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5)); for (let s = 0; s <= n; s++) { const q = s / n; parts.rect(E, T, RD(x0 + (x1 - x0) * q - 0.5), RD(y0 + (y1 - y0) * q - 0.5), 2, 2, m, t); } }
  const glowT = (lv, strong) => (lv === 4 ? 1 : lv >= 2 ? (strong || lv === 3 ? 4 : 3) : lv === 1 ? (strong ? 4 : 3) : (strong ? 3 : 2));

  // 候选部件：beakSkull（鹰头骨盔：整只鸟头骨扣在头上——圆颅、大眼窝一点光、钩喙从颅前伸出 b+4 格再往下勾，喙下留出僵尸的嘴；可做成 helm 的一种 style）
  // T = 头饰坐标（u = 0 头中线，v = 0 头顶那一行），表格按头宽 5 格（a = -2、b = 2）画；o = { bone, glow, lv 眼光档 0–4, crest 羽冠材质, sw 羽冠摆 }
  // B 骨 · b 骨暗面 · H 喙脊高光 · S 眼窝（暗）· G 眼光 · K 喙 · k 喙尖（暗）
  const SKULL = ['..BBB.....', '.BBBBB....', 'BBBBSSB...', 'BBBBSGBHH.', 'bB....KKKK', 'b.......KK', '.........k'];
  function beakSkull(T, o) {
    const m = o.bone;
    for (let r = 0; r < SKULL.length; r++) for (let c = 0; c < 10; c++) {
      const ch = SKULL[r][c], u = c - 3, v = r - 2; if (ch === '.') continue;
      if (ch === 'G') px(T, u, v, o.glow, glowT(o.lv, 1)); else px(T, u, v, m, ch === 'H' ? 4 : ch === 'S' ? 1 : ch === 'k' || ch === 'b' ? 2 : 0);
    }
    px(T, -1, -1, m, 4); px(T, -2, 0, m, 2); px(T, 5, 2, m, 2);                                                  // 颅顶反光 · 骨缝 · 鼻孔
    if (o.crest) { const s = o.sw || 0; for (const [u, h] of [[-1, 3], [0, 4], [1, 3]]) for (let k = 1; k <= h; k++) px(T, u + (k === h ? s : 0) - (k > 2 ? 1 : 0), -2 - k, o.crest, k === h ? 4 : u === 0 ? 3 : 2); }   // 羽冠（投石弓手起）
  }
  // 头：尸绿灰的脸（下颌 + 牙）和鹰头骨是同一个部件——头只有 6 格高，头骨单独成部件会把整张脸压成勾线色
  function drawHead(R) {
    parts.head(E, R, P, { mat: M.skin, face: 'gaunt', nose: 'none', mouth: 'none', ear: 'none' });
    const T = fr(R, 0, R.hx, R.htop);
    px(T, 2, 3, M.skin, 1); px(T, 1, 4, M.teeth, 4); px(T, 2, 4, M.teeth, 3); px(T, 0, 5, M.skin, 2); px(T, 1, 2, M.skin, 2);   // 张着的嘴 · 牙 · 下颌 · 凹进去的眼
    if (!P.helm) beakSkull(T, { bone: M.bone, glow: M.glow, lv: P.eyes || P.gem === 4 ? 4 : 0 });
  }
  // 候选部件：recurve（短反曲弓：弓臂向后弯、梢尾往前翻，握把缠皮绳，上梢挂羽饰；竖握，弦拉到搭箭点）
  // T = 以握点为原点的落笔变换；o = { bone, wrap, string, charm, pull 0–3, nk 搭箭点（弓本地坐标）, twang 弦抖, sw 羽饰摆 }
  const BOW0 = [0, 0, -1, -1, -2, -2, -2, -1, 0], BOW2 = [0, 0, -1, -2, -2, -3, -3, -2, -1], BL = 8;
  function recurve(T, o) {
    const pr = o.pull >= 2 ? BOW2 : BOW0, sx = pr[6] - 1;
    E.part();
    for (let r = -BL; r <= BL; r++) { const a = Math.abs(r), x = pr[a]; px(T, x, r, o.bone, a === BL ? 4 : a <= 1 ? 3 : 0); if (a <= 2) px(T, x + 1, r, o.bone, 2); }
    for (let r = -1; r <= 1; r++) px(T, 1, r, o.wrap, r === -1 ? 4 : 2);                                          // 皮绳缠握把
    const sw = o.sw || 0; px(T, 1, -BL, o.charm, 3); px(T, 2, -BL + 1 + (sw < 0 ? 0 : 0), o.charm, 4); px(T, 2 + (sw > 0 ? 1 : 0), -BL + 2, o.charm, 3); px(T, 2 + (sw > 0 ? 1 : 0), -BL + 3, o.charm, 2);   // 上梢羽饰
    const nk = o.nk;
    if (o.pull > 0 && nk && nk[0] < sx) { parts.line(E, T, sx, -6, nk[0], nk[1], o.string, 3); parts.line(E, T, nk[0], nk[1], sx, 6, o.string, 3); }
    else { for (let r = -6; r <= 6; r++) px(T, sx - (o.twang && Math.abs(r) <= 3 ? 1 : 0), r, o.string, 3); }
    return sx;
  }
  // 水刃箭：木杆 + 羽 + 弯月刃形箭头（发光体，和箭同一部件）；big = 蓄满后的 3 格弯月水刃
  const AY = -2;                                                        // 箭搭在握把上方 2 格（箭台），不和握弓的手臂叠在一起
  function arrow(T, x0, lv, big) {
    E.part(); const y = AY, g = M.glow;
    for (let x = x0; x <= 3; x++) px(T, x, y, M.shaft, 3);
    px(T, x0 + 1, y - 1, M.mantle, 4); px(T, x0, y - 1, M.mantle, 3); px(T, x0 + 1, y + 1, M.mantle, 2);
    if (big) { px(T, 6, y, g, glowT(lv, 1)); px(T, 5, y, g, glowT(lv, 1)); px(T, 5, y - 1, g, glowT(lv, 1)); px(T, 5, y + 1, g, glowT(lv, 1)); px(T, 4, y - 2, g, glowT(lv, 0)); px(T, 4, y + 2, g, glowT(lv, 0)); px(T, 4, y, g, glowT(lv, 0)); }
    else { px(T, 5, y, g, glowT(lv, 1)); px(T, 4, y - 1, g, glowT(lv, 0)); px(T, 4, y + 1, g, glowT(lv, 0)); px(T, 4, y, g, glowT(lv, 1)); }
  }
  // 箭袋：后背斜挎的细筒（2 格宽，筒口在肩后上方），露出 3 支箭：箭头是水青弯月刃
  function quiver(R) {
    const e = parts.edges(R, R.yS + 3), x0 = e[0] + 2, y0 = R.yWaist + 1;
    E.part(); parts.bar(15, x0, y0, 0, 9, 2, (k, j, X, Y) => px(R, X, Y, k === 3 || k === 8 ? M.belt : M.quiver, k === 9 ? 4 : j === 0 ? 4 : 2));
    const c = parts.cell(15, x0, y0, 10);
    E.part();
    for (let i = 0; i < 3; i++) {
      const bx = c[0] - 1 + i, by = c[1] + (i === 1 ? -1 : 0), lit = P.qf === i + 1;
      px(R, bx, by, M.shaft, 3); px(R, bx - (i === 2 ? 0 : 1), by - 1, M.shaft, 3);
      const hx = bx - (i === 2 ? 0 : 1), hy = by - 2; px(R, hx, hy, M.glow, lit ? 4 : 3); px(R, hx - 1, hy + (i === 0 ? 0 : 0), M.glow, lit ? 4 : 2); if (lit) px(R, hx + 1, hy, M.glow, 3);
    }
  }
  // 候选部件：drawArm（手肘位置显式给出的手臂：拉弦臂的肘在身后，parts.arm 的两节 IK 摆不出来）——皮袖上臂 → 裸露的尸皮前臂（一道黑线缝合）→ 手
  function drawArm(R, sx, sy, ex, ey, hx, hy, o) {
    E.part(); sweep2(R, sx, sy, ex, ey, o.sleeve, 0);
    E.part(); sweep2(R, ex, ey, hx, hy, o.skin, 0);
    for (const q of [0.3, 0.55]) px(R, RD(ex + (hx - ex) * q), RD(ey + (hy - ey) * q), o.ink, 1);            // 缝合线
    if (o.cuff) { E.part(); parts.brush(E, R, ex + (hx - ex) * 0.72, ey + (hy - ey) * 0.72, 0.9, o.cuff, 0); }
    E.part(); parts.rect(E, R, hx - 1, hy - 1, 2, 2, o.skin, 0); px(R, hx - 1, hy - 1, o.skin, 4);
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY), kneel = R.kneel;
    quiver(R);
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.sleeveD, at: [P.bhx, P.bhy], grip: 'none' });
    parts.legs(E, R, P, { style: 'shoe', mat: M.pants, matD: M.pantsD, boot: M.boot, bootD: M.bootD, bootH: 2 });
    if (!kneel) px(R, R.footFx + 2, -R.footFup, M.skin, 3);                                                     // 破靴露出的脚趾
    parts.torso(E, R, P, { style: 'leather', mat: M.coat, belt: M.belt, buckle: M.bone, strap: M.quiver });
    parts.mantle(E, R, P, { style: 'plain', mat: M.mantle, len: 4 });
    { const yb = R.yS + 3, e = parts.edges(R, yb), L = e[0] - 2, s = P.beard > 0 ? 1 : P.beard < 0 ? -1 : 0;   // 乱羽：下沿 3 根长羽往后下翘出轮廓（和披肩同一个部件）
      parts.line(E, R, L, yb + 1, L - 2 + s, yb + 4, M.mantle, 0); parts.line(E, R, L + 1, yb + 1, L + 1 + s, yb + 5, M.mantle, 2); parts.line(E, R, L + 3, yb + 1, L + 3, yb + 3, M.mantle, 0); px(R, L - 2 + s, yb + 4, M.mantle, 4); }
    drawHead(R);
    const nkx = P.hx - P.bhx, nky = P.hy - P.bhy;
    if (P.bowF) {
      const T = free(P.bowR, P.bowX, P.bowY); recurve(T, { bone: M.bone, wrap: M.wrap, string: M.string, charm: M.mantle, pull: 0 });
    } else {
      const T = fr(R, 0, P.bhx, P.bhy), sx = recurve(T, { bone: M.bone, wrap: M.wrap, string: M.string, charm: M.mantle, pull: P.pull, nk: [nkx, nky], twang: P.twang, sw: P.beard });
      if (P.nock) arrow(T, P.pull ? nkx : sx, P.gem, P.big);
      parts.hand(E, R, P, { side: 'B', at: [P.bhx, P.bhy], hand: M.skin });
    }
    drawArm(R, R.sFx, R.sFy, P.ex, P.ey, P.hx, P.hy, { sleeve: M.sleeve, skin: M.skin, ink: M.ink });
    if (P.helm) { E.part(); beakSkull(free(P.hatR, P.hatX, P.hatY), { bone: M.bone, glow: M.glow, lv: 4 }); }         // 被打飞的鹰颅盔（单独一个部件，散架时自己飞）
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx - P.bx + hero.ox + P.bx; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  // 弹射：命中后折线弹向第二个目标的小弹（按抛物线飞，自己计时；kind 0 = 攻击的小箭，1 = 技能的水刃大箭）
  const HOP = [{ on: 0 }, { on: 0 }];
  function hop(kind, x0, y0, x1, y1, h, dur) { const H = HOP[kind]; H.on = 1; H.t = 0; H.x0 = x0; H.y0 = y0; H.x1 = x1; H.y1 = y1; H.h = h; H.dur = dur; H.n = 0; }
  const hopAt = (H, q) => [H.x0 + (H.x1 - H.x0) * q, H.y0 + (H.y1 - H.y0) * q - H.h * 4 * q * (1 - q)];
  function hopLand(kind, x, y) {
    if (kind === 0) { burst(x, y, 6, 20, 50, 0.15, 0.3, R_EL, 8); fx.cross(x, y, 3, R_EL, 0.16); sfx('hit', { mat: 'flesh', w: 0.2 }); }
    else { fx.cross(x, y, 5, R_EL, 0.25); ring(x, y, 0, R_EL); burst(x, y, 12, 30, 80, 0.2, 0.5, R_EL, 14); fx.slash(x - 5, y + 5, 7, 0.2, 1.4, R_EL, 0.18, 1, 2); sfx('impact', { pal: 'water', w: 0.35 }); }
  }
  let mzT = 9, mzX = 0, mzY = 0, xsT = 9, xsX = 0, xsY = 0, chargeAcc = 0, soulAcc = 0, lastStep = 0;
  function onEnter(s) {
    if (s !== CAST) return;
    const gx = scrX(P.gx), gy = HY + P.gy;
    releaseOrbit(40, 90, 0.3, 0.6); burst(gx + 2, gy, 12, 50, 110, 0.25, 0.55, R_EL, 10); fx.cross(gx + 3, gy, 6, R_EL, 0.22); ring(gx + 2, gy, 0, R_EL);
    shoot(2, gx + 4, gy, 150, DUMMY_X - 4, R_EL, 0, { trail: { every: 1, life: [0.2, 0.4], back: [6, 18], off: 4 } });
    shake(0.28, 2); flash(0.05); mzT = 0; mzX = gx + 2; mzY = gy;
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_REL) {                                  // 放箭：枪口十字光 2 帧 + 平射一箭
      poseAt(ATTACK, T_REL - 1 / 12, T_REL - 1 / 12); const ax = scrX(P.gx), ay = HY + P.gy; poseAt(ATTACK, t, t);
      mzT = 0; mzX = ax; mzY = ay; shoot(1, ax + 2, ay, 200, DUMMY_X - 3, R_EL, 0, { trail: { every: 2, life: [0.1, 0.2], back: [8, 20], off: 2 } });
      burst(ax, ay, 5, 20, 50, 0.12, 0.25, R_EL, 0); sfx('swing', { kind: 'bow', w: 0.3 }); sfx('shoot', { proj: 'arrow' });
    }
    if (s === DEATH && Math.abs(t - T_KIT) < 1e-9) {                    // 散架：跪塌的那一帧拆成部件，躯干塌成一堆
      poseAt(DEATH, T_KIT - 1 / 12, T_KIT - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('parts', { power: 0.45, push: -8, fromX: 2, fromY: -8, fadeAt: 1.15, fadeDur: 0.6 });
      for (let i = 0; i < 8; i++) spawn(K_DUST, HX - 6 + Math.random() * 14, HY - 1, (Math.random() - 0.5) * 24, -6 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust);
    }
    if (s === DEATH && Math.abs(t - T_FALL) < 1e-9) { for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 10 + Math.random() * 22, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.35 }); }
  }
  const EVENTS = [[], [], [T_REL], [], [], [], [], [T_KIT, T_FALL], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 7, 30, 70, 0.12, 0.3, R_EL, 8); hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.3 }); hop(0, x + 2, y, DUMMY_X + 13, HY - 9, 7, 0.3); }
    else if (k === 2) {                                                 // 水刃大箭：假人身上 X 形交叉斩击 + 水花外爆，再以 45° 弹起飞向后方第二个目标
      xsT = 0; xsX = DUMMY_X; xsY = HY - 15;
      burst(x, y, 22, 50, 130, 0.25, 0.6, R_EL, 16); fx.cross(x + 2, y, 5, R_EL, 0.2); hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'water', w: 0.6 });
      hop(1, x + 4, y - 1, DUMMY_X + 16, HY - 8, 12, 0.42);
    }
  }
  function hurtFx(s) {                                                  // 僵尸：骨灰 + 少量魂光，外加一两根披肩乱羽
    const hx = HX + 2, hy = HY - 14; burst(hx, hy, s === DEATH ? 20 : 12, 40, 110, 0.25, 0.55, FXI.dust, 18); burst(hx, hy, 5, 20, 60, 0.3, 0.6, R_EL, 10);
    spawn(K_BURST, hx - 4, hy - 3, -30, -20, 0.6, FXI.earth); shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {                                             // 水滴从地面和四周螺旋汇聚到箭头
      chargeAcc += dt * (22 + 34 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const low = Math.random() < 0.5, a = low ? 0.5 + Math.random() * 2.1 : Math.random() * 6.2832, r = low ? 14 + Math.random() * 8 : 10 + Math.random() * 8; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.4), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
    }
    if (state === MOVE && P.step !== lastStep) {                        // 蹒跚：接触帧 1 颗尘，后脚拖地再带 1 颗
      if (P.step !== 0) { sfx('step', { w: 0.3 }); spawn(K_DUST, scrX(P.step > 0 ? 4 : -4), HY, (Math.random() - 0.5) * 10, -3 - Math.random() * 4, 0.3, FXI.dust); spawn(K_DUST, scrX(-5), HY, P.flip ? 8 : -8, -2, 0.25, FXI.dust); }
      lastStep = P.step;
    }
    if (state === DEATH && stT > INCOMING + 1.3 && stT < INCOMING + 2.2) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 24, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_EL); } }
    for (let k = 0; k < 2; k++) {
      const H = HOP[k]; if (!H.on) continue; H.t += dt; const q = H.t / H.dur;
      if (q >= 1) { H.on = 0; hopLand(k, H.x1, H.y1); continue; }
      if ((H.n++ & 1) === 0) { const p = hopAt(H, q); spawn(K_TRAIL, p[0] - 1, p[1] + (Math.random() - 0.5) * 2, -10, 4, k ? 0.3 : 0.18, R_EL); }
    }
    mzT += dt; xsT += dt;
  }
  function fxReset() { mzT = 9; xsT = 9; chargeAcc = 0; soulAcc = 0; lastStep = 0; HOP[0].on = 0; HOP[1].on = 0; }
  function fxBack(f12) { if (P.dq < 1 && P.rim >= 2) floorGlow(scrX(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; put(mzX, mzY, EL[0]); for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } }
    if (P.big && P.gem >= 2 && P.dq < 1) { const gx = scrX(P.gx), gy = HY + P.gy, L = 2 + (f12 & 1); for (let r = 2; r <= L + 1; r++) { const c = r <= 2 ? EL[0] : EL[1]; put(gx + r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); } }
    for (let k = 0; k < 2; k++) {                                       // 弹射中的箭：按速度方向画
      const H = HOP[k]; if (!H.on) continue; const q = H.t / H.dur, p = hopAt(H, q), x = RD(p[0]), y = RD(p[1]);
      const vx = H.x1 - H.x0, vy = (H.y1 - H.y0) - H.h * 4 * (1 - 2 * q), l = Math.hypot(vx, vy), ux = vx / l, uy = vy / l;
      const at = (s) => [RD(x - ux * s), RD(y - uy * s)];
      if (k === 0) { put(x, y, EL[0]); let c = at(1); put(c[0], c[1], EL[1]); c = at(2); put(c[0], c[1], 18); c = at(3); put(c[0], c[1], 19); }
      else { put(x, y, EL[0]); const n = [-uy, ux]; for (const s of [-1, 1]) { put(RD(x - ux + n[0] * s * 1.2), RD(y - uy + n[1] * s * 1.2), EL[0]); put(RD(x - ux * 2 + n[0] * s * 2), RD(y - uy * 2 + n[1] * s * 2), EL[1]); } for (let s = 1; s <= 4; s++) { const c = at(s); put(c[0], c[1], s < 3 ? EL[1] : EL[2]); } }
    }
  }
  // X 形水刃斩：两道对角斩线先后 1 帧劈在假人身上（亮芯 + 深蓝刃边，在奶白的假人上也看得清），后半段断续消散
  function fxTop() {
    for (let k = 0; k < 2; k++) {
      const t = xsT - k / 12, s = k ? -1 : 1; if (t < 0 || t > 0.36) continue; const late = t > 0.2, core = t < 1 / 12 ? EL[0] : t < 0.2 ? EL[1] : EL[2], edge = t < 0.2 ? EL[3] : EL[4], L = t < 1 / 12 ? 5 : 8;
      for (let i = -L; i <= L; i++) { if (late && (i & 1)) continue; const x = xsX + i * s, y = xsY + i; put(x, y, Math.abs(i) >= L - 1 ? EL[1] : core); if (Math.abs(i) < L - 1) put(x, y + 1, edge); }
    }
  }
  function drawShot(k, x, y, d, f12, R) {
    if (k === 1) { put(x, y, R[0]); put(x - d, y, R[1]); put(x - d, y - 1, R[1]); put(x - d, y + 1, R[1]); put(x - 2 * d, y, 18); put(x - 3 * d, y, 18); put(x - 4 * d, y, 19); put(x - 4 * d, y - 1, 19); return true; }
    if (k === 2) {                                                      // 蓄满的水刃大箭：弯月刃（5 格高）+ 箭杆
      put(x + d, y, R[0]); put(x, y, R[0]); put(x, y - 1, R[0]); put(x, y + 1, R[0]); put(x - d, y - 2, R[1]); put(x - d, y + 2, R[1]); put(x - d, y, R[1]);
      if (f12 & 1) { put(x - 2 * d, y - 3, R[2]); put(x - 2 * d, y + 3, R[2]); }
      for (let s = 2; s <= 6; s++) put(x - s * d, y, s < 4 ? R[1] : R[2]); return true;
    }
    return false;
  }

  return {
    name: '鹰喙弓手', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.glow], HIT_POINT: [1, -13], EVENTS,
    deathKit: { mode: 'parts', at: T_KIT },
    SFX: { body: 'flesh', how: 'collapse', pal: 'water', style: 'blade', w: 0.35 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, fxTop, drawShot, hurtFx,
  };
});
