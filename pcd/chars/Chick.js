// 雏鸡（部队 · 不死 · 商人 · 普通 · 远程 600）：从餐桌上爬回来的灰黄小鸡——圆球身体压一颗大圆头，头顶三根呆毛，
// 一侧翅膀是只剩三根细骨的秃骨翅，脖子上红绳挂一枚方孔铜钱，肚皮一道麻绳十字缝线，空眼窝里一点金色魂火。
// 攻击：鼓嗉吐骨米（轻抛物线）；技能「美味 · 下金蛋」：蹲窝炸毛 → 屁股下蹦出金蛋、被喙挑飞 → 金蛋在假人头顶裂开洒一地金币。
// 死亡：膨成一团后「噗」地炸成绒毛（死亡套件 burst），铜钱和金币弹出落地，魂火眼最后熄灭。升级 → 公鸡、火鸡。
// 身体用 parts-beast 的 fly 骨架（身体、远翼、收起的腿）；大圆头、呆毛、秃骨翅、铜钱、缝线是本模块的部件。
PCD.define('Chick', (E) => {
  const { Sprite, begin, part, sp, bake, ease, clamp01, keys, mix, q12, f12of, gait, walkDemo, near, color, fxRamp, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_PHYS, K_TRAIL,
    spawn, spawnX, burst, clearOrbit, ring, shake, flash, fx, death, sfx, hitDummy, put, scrX, floorGlow, groundShadow } = E;
  const B = E.parts.beast, F = B.fly, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const C0 = color('#2a2a22'), C1 = color('#6e6c56'), C2 = color('#b4b08c'), C3 = color('#e2dfc2'), C_BEAK = near('#c8782a');
  const FUZZ = [C0, C1, C2, C3];                                                             // 灰黄尸绒（褪色蛋黄）
  const R_EL = FXI.coin, EL = FXR[R_EL];                                                     // 美味 · 金币：21 白 → 5 奶油 → 14 金 → 61 暗沙 → 20 深木
  const R_FLUFF = fxRamp('chickFluff', [C3, C2, 7, C1, C0]);                                 // 飘落的绒毛
  const m = B.mats(E, { main: FUZZ, feather: FUZZ, bone: 'bone', leg: [20, 19, C_BEAK, 14], beak: [20, 19, C_BEAK, 14],
    string: 'crimson', coin: 'gold', twine: 'sand', eye: [20, 14, 51, 21], glow: [51, 51, 21, 21] });   // eye 平涂：tone 1 熄 · 2 金 · 3 淡金 · 4 白
  const o = F.shape({ alt: 3, rx: 5, ry: 4, head: 'bird', hr: 4, beak: 2, beakH: 2, hook: 0, crest: null, tail: 'none',
    wing: { span: 5, chord: 2, type: 'feather', fingers: 3 }, legLen: 2, talon: 1, m });
  const BONE_W = { span: 6, fingers: 3 }, LIFT0 = 3;                                         // 秃骨翅比绒毛远翼长一点，扑起来像爪子；LIFT0 + alt 3 = 离地 6

  const HX = 34, DUR = DEFAULT_DUR.slice(), hero = new Sprite(48, 44, 22, 40);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 12, 16], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['eye', 'glow', 'ink', 'beak', 'leg', 'coin', 'string', 'twine', 'bone', 'boneFar']) RIM.skip[m[k]] = 1;
  const SPEC = F.KEYS.concat(B.COMMON, [['hdx', -2, 3], ['tuft', -1, 1], ['coin', -2, 2], ['crop', 0, 1], ['puff', 0, 2], ['eyeLv', 0, 4]]);
  const P = {};
  function reset() { F.reset(P); P.hdx = 0; P.tuft = 0; P.coin = 0; P.crop = 0; P.puff = 0; P.eyeLv = 1; P.lift = LIFT0; P.legs = 0; }
  reset();
  let rig = F.rig(P, o);
  const hd = { x: 0, y: 0, r: 4 };
  function build() {
    rig = F.rig(P, o); rig.rx = o.rx + P.puff * 0.8; rig.ry = o.ry + P.puff * 0.8;       // 炸毛：轮廓每边胀 1 格
    const C = rig.C, h = U.toW(C.x, C.y, C.a, 2, -6.5 - P.puff * 0.5);   // 大圆头压在圆球身体上，只重叠一行多
    hd.x = h[0] + P.hdx; hd.y = h[1] + P.head; hd.r = 4 + (P.puff >= 2 ? 1 : 0);
  }
  build();
  const HIT_POINT = [0, R(rig.C.y)];
  const eyeAt = () => [R(hd.x + 1.5), R(hd.y - 0.5)];
  const beakAt = () => [R(hd.x + hd.r) + 2, R(hd.y + 0.5)];
  const nestAt = () => [rig.C.x - 1, rig.C.y + rig.ry + 2];                                  // 蓄力时金蛋在身下成形的位置

  // ───── 姿势 ─────
  const F_ALL = ['lift', 'pitch', 'head', 'hdx', 'jaw', 'crop', 'puff', 'tuft', 'coin', 'bx'];
  const REST = { lift: LIFT0, pitch: 0, head: 0, hdx: 0, jaw: 0, crop: 0, puff: 0, tuft: 0, coin: 0, bx: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ lift: 4, pitch: -2, head: -1, hdx: -1, crop: 1, tuft: 1, bx: -1 });           // 后仰鼓嗉
  const A_SPIT = pose({ lift: 3, pitch: 1, head: 1, hdx: 2, jaw: 2, tuft: -1, coin: -1, bx: 1 });      // 前伸张喙
  const A_HOLD = pose({ lift: 3, pitch: 1, hdx: 1, jaw: 1, coin: 1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_SPIT, 'snap'], [0.25, A_SPIT, 'lin'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_NEST = pose({ lift: 2, head: 1, hdx: -1, puff: 1, tuft: 1 });                              // 蹲窝炸毛
  const S_POP = pose({ lift: 6, pitch: -1, head: -1, tuft: -1, coin: -2 });                          // 身体一弹，金蛋蹦出
  const S_FLICK = pose({ lift: 5, pitch: 2, head: 2, hdx: 2, jaw: 1, tuft: 1, coin: 2 });             // 喙挑
  const S_WATCH = pose({ lift: 4, hdx: 1 });
  const PECK = [[1, 1, 0, 0], [2, 2, 1, 1], [1, 1, 0, -1], [0, 0, 0, 1], [0, 0, 0, -1], [0, 0, 0, 1], [0, 0, 0, 0]];   // 啄铜钱：[head, hdx, jaw, coin]
  const T_HIT = 2 / 12, T_FLICK = 2 / 12, T_POP = 0.62, T_BURST = INCOMING + T_POP;
  const tmp = {};
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  function flap(f12) { const f = (f12 >> 1) & 3; P.gf = f; P.bob = B.FLAP_BOB[f]; }
  function idle(tq, f12) {
    flap(f12); P.lift = LIFT0; P.eyeLv = 1;
    const lp = tq % DUR[IDLE];
    if (lp >= 0.4 && lp < 0.8) { P.hdx = -1; P.tuft = 1; }                                   // 待机个性：歪头（往后 → 往前）
    else if (lp >= 0.8 - 1e-6 && lp < 1.2) { P.hdx = 1; P.tuft = -1; }
    if (lp >= 1.0 - 1e-6 && lp < 1.15) P.eyeLv = 3;                                        // 魂火眼闪一下
    if (lp >= 1.6 - 1e-6 && lp < 2.2) { const s = PECK[Math.min(6, f12of(lp - 1.6))]; P.head = s[0]; P.hdx = s[1]; P.jaw = s[2]; P.coin = s[3]; }   // 低头啄铜钱
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                 // 扑腾跳飞：离地 6 → 5 → 3 → 4，短翅每帧一扑
      const f = gait(tq); P.gf = f12 & 3; P.lift = [3, 2, 0, 1][f]; P.pitch = f === 1 ? 1 : f === 3 ? -1 : 0;
      P.tuft = f === 2 ? 1 : f === 0 ? -1 : 0; P.coin = [0, -1, 1, 0][f];
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F_ALL); apply(tmp);
      if (tq < 0.12) { P.gf = -1; P.wing = 4; } else if (tq < 0.25) { P.gf = -1; P.wing = 5; P.eyeLv = 2; P.rim = 1; } else flap(f12);
    } else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.7)); mix(tmp, REST, C_NEST, q, F_ALL); apply(tmp);
      P.lift = q > 0.2 ? 2 : 3; P.puff = q > 0.45 ? 1 : 0; P.head = q > 0.7 ? 1 : 0; P.hdx = q > 0.7 ? -1 : 0;   // 一格一格落下、炸毛、低头
      P.gf = -1; P.wing = q > 0.3 ? 0 : 4; P.eyeLv = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
      if (tq > 1.1) { P.tuft = (f12 & 1) ? 1 : -1; P.bob = f12 & 1; P.coin = (f12 & 1) ? 1 : -1; }   // 绒毛抖
    } else if (st === CAST) {
      if (tq < 0.1) apply(S_POP); else if (tq < 0.2) apply(S_FLICK); else { mix(tmp, S_FLICK, S_WATCH, ease.out(clamp01((tq - 0.2) / 0.15)), F_ALL); apply(tmp); }
      if (tq < 0.25) { P.gf = -1; P.wing = 5; } else flap(f12);
      P.eyeLv = 3; P.rim = 3;
    } else if (st === RECOVER) {                                                            // 绒毛落回，低头啄一下铜钱
      const q = ease.inOut(clamp01(tq / 0.6)); mix(tmp, S_WATCH, REST, q, F_ALL); apply(tmp); flap(f12);
      if (tq >= 0.25 && tq < 0.55) { const s = PECK[Math.min(6, f12of(tq - 0.25))]; P.head = s[0]; P.hdx = s[1]; P.jaw = s[2]; P.coin = s[3]; }
      P.eyeLv = q < 0.35 ? 2 : 1; P.rim = q < 0.4 ? 2 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0 || h >= 0.35) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.eyes = 1; P.eyeLv = 0; P.gf = -1; P.wing = 1; P.pitch = -1; P.legs = 2; P.tuft = 1; P.coin = -2; P.hdx = -1; P.flash = h < 1 / 12 ? 1 : 0; }
      else { P.bx = -1; P.eyes = 1; P.eyeLv = 0; P.gf = -1; P.wing = 4; P.coin = 1; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.eyes = 1; P.eyeLv = (f12 & 1) ? 2 : 0; P.gf = -1; P.wing = 1; P.pitch = -1; P.legs = 2; P.tuft = 1; P.coin = -2; P.hdx = -1; P.flash = d < 1 / 12 ? 1 : 0; }
      else if (d < T_POP) {                                                                 // 先膨成一团：炸毛 1 → 2、翅膀张开、发抖
        P.puff = d < 0.42 ? 1 : 2; P.gf = -1; P.wing = 5; P.legs = 2; P.eyes = 1; P.eyeLv = (f12 & 1) ? 3 : 1;
        P.bx = -2 - (f12 & 1); P.tuft = (f12 & 1) ? 1 : -1; P.coin = (f12 & 1) ? 2 : -2; P.lift = d < 0.45 ? 3 : 4; P.pitch = -1;
      } else P.dq = 1;                                                                      // 炸开之后由死亡套件画碎片
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    build();
    if (st === CHARGE || (st === CAST && tq < 0.1)) { const e = nestAt(); P.gx = R(e[0]) + P.bx; P.gy = R(e[1]); }
    else { const e = eyeAt(); P.gx = e[0] + P.bx; P.gy = e[1]; }
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：boneWing 秃骨翅——翼姿同 B.WINGS；只剩臂骨 + 三根指骨（各 1 格），腕关节和指尖亮骨色，臂骨上挂两撮残绒。
  //   (x, y) 翼根；w = { span, fingers }；bone 骨材质；fluff 残绒材质。一个部件。
  function boneWing(x, y, pose, w, bone, fluff) {
    part();
    const W = B.WINGS[pose | 0] || B.WINGS[0], a0 = W[0], aT = W[1], fold = W[2], span = w.span, nf = w.fingers || 3;
    const arm = span * (0.42 - 0.14 * fold), wx = x - Math.cos(a0) * arm, wy = y - Math.sin(a0) * arm;
    U.seg(E, x, y, wx, wy, 1, bone, 0);
    for (let k = 0; k < nf; k++) {
      const q = nf === 1 ? 1 : k / (nf - 1), fa = a0 + (aT - a0) * (0.25 + 0.75 * q), fl = span * (0.66 - 0.1 * q) * (1 - 0.5 * fold);
      const tx = wx - Math.cos(fa) * fl, ty = wy - Math.sin(fa) * fl;
      U.seg(E, wx, wy, tx, ty, 1, bone, k === 0 ? 4 : 0); U.dot(E, tx, ty, bone, 4);
    }
    U.dot(E, wx, wy, bone, 4);
    U.dot(E, x + (wx - x) * 0.45, y + (wy - y) * 0.45 + 1, fluff, 3); U.dot(E, x + (wx - x) * 0.45 + 1, y + (wy - y) * 0.45 + 1, fluff, 2);   // 残绒
  }
  function stitches() {                                                                     // 肚皮一道缝线 + 两个麻绳十字（紧跟身体画，同一个部件）
    const C = rig.C, v = rig.ry * 0.45;
    for (let u = -2; u <= 1; u++) { const p = U.toW(C.x, C.y, C.a, u, v + (u === -2 ? -1 : 0)); U.dot(E, p[0], p[1], m.body, 1); }
    for (const u of [-1, 1]) { const a = U.toW(C.x, C.y, C.a, u, v - 1), b = U.toW(C.x, C.y, C.a, u, v), c = U.toW(C.x, C.y, C.a, u, v + 1); U.dot(E, a[0], a[1], m.twine, 3); U.dot(E, b[0], b[1], m.twine, 2); U.dot(E, c[0], c[1], m.twine, 3); }
  }
  function fuzz() {                                                                         // 外沿绒毛：几撮伸出轮廓 1 格，炸毛时更多更长
    const C = rig.C, n = P.puff ? 14 : 8;
    for (let k = 0; k < n; k++) {
      const a = (k + 0.5) / n * 6.2832 + 0.3; if (Math.sin(a) > 0.55 && !P.puff) continue;   // 平时腹下不起毛
      const L = P.puff >= 2 && (k & 1) ? 2 : 1;
      for (let s = 1; s <= L; s++) { const p = U.toW(C.x, C.y, C.a, Math.cos(a) * (rig.rx + s), Math.sin(a) * (rig.ry + s)); U.dot(E, p[0], p[1], m.body, s === L ? 4 : 3); }
    }
  }
  function feet() {                                                                        // 收起的细短腿：肚皮下两只橙色小脚（在身体前，压一道分界线）
    part(); const C = rig.C, y = R(C.y + rig.ry + 0.4);
    for (const dx of [-2, 1]) U.dot(E, C.x + dx, y, m.leg, dx > 0 ? 4 : 3);
  }
  function coinCenter() { return [rig.C.x + 4 + P.coin * 0.6, rig.C.y + rig.ry - 1 - Math.abs(P.coin) * 0.3]; }   // 挂在胸前下方，伸出前沿 2–3 格
  function string() {                                                                       // 红绳：下巴 → 铜钱（并进身体部件，不压分界线）
    const c = coinCenter(); U.seg(E, hd.x + 1, hd.y + hd.r - 0.5, c[0], c[1] - 2.5, 1, m.string, 3);
  }
  function coin() {                                                                         // 方孔铜钱 5×5（切角），方孔是墨
    part(); const c = coinCenter(), cx = R(c[0]), cy = R(c[1]);
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { if (Math.abs(i) === 2 && Math.abs(j) === 2) continue; U.dot(E, cx + i, cy + j, m.coin, 0); }
    U.dot(E, cx, cy, m.ink, 0); U.dot(E, cx - 1, cy - 1, m.coin, 4);
  }
  function head() {
    part();
    U.oval(E, hd.x, hd.y, hd.r, hd.r * 0.95, m.limb, 0);
    U.dot(E, hd.x - hd.r + 1, hd.y + 1, m.limb, 2); U.dot(E, hd.x - hd.r + 2, hd.y + 2, m.limb, 2);   // 后脑绒毛纹
    if (P.crop) { U.dot(E, hd.x + 2, hd.y + hd.r, m.limb, 3); U.dot(E, hd.x + 3, hd.y + hd.r - 1, m.limb, 3); U.dot(E, hd.x + 1, hd.y + hd.r + 1, m.limb, 2); }   // 鼓嗉
    const xe = R(hd.x + hd.r), by = R(hd.y + 0.5), jaw = P.jaw | 0;                         // 短喙
    sp(xe + 1, by, m.beak, 4); sp(xe + 2, by, m.beak, 3);
    if (jaw) { sp(xe + 1, by + 1, m.ink, 0); sp(xe + 1, by + 1 + jaw, m.beak, 2); sp(xe + 2, by + 1 + jaw, m.beak, 2); if (jaw > 1) sp(xe + 1, by + 2, m.ink, 0); }
    else sp(xe + 1, by + 1, m.beak, 2);
    const [ex, ey] = eyeAt();                                                               // 空眼窝 + 魂火
    sp(ex - 1, ey - 1, m.limb, 4); sp(ex, ey - 1, m.limb, 4);
    sp(ex, ey, m.ink, 0); sp(ex + 1, ey, m.ink, 0); sp(ex, ey + 1, m.ink, 0);
    const lv = P.eyes ? 0 : P.eyeLv;
    if (lv === 0) sp(ex, ey + 1, m.eye, 1);
    else if (lv === 1) sp(ex, ey, m.eye, 2);
    else if (lv === 2) { sp(ex, ey, m.eye, 3); sp(ex + 1, ey, m.eye, 2); }
    else if (lv === 3) { sp(ex, ey, m.eye, 4); sp(ex + 1, ey, m.eye, 3); sp(ex, ey - 1, m.eye, 3); }
    const top = R(hd.y - hd.r * 0.95), cx = R(hd.x - 0.5), sw = P.tuft | 0;                 // 三根呆毛：后、中、前扇开，尖端随 tuft 摆
    const TUFTS = [[[-1, -1], [-2, -2], [-3 + sw, -3]], [[0, -1], [0, -2], [sw, -3], [sw + 1, -4]], [[1, -1], [2, -2], [3 + sw, -2]]];
    for (const s of TUFTS) s.forEach(([dx, dy], i) => sp(cx + dx, top + dy, m.limb, i === s.length - 1 ? 4 : 3));
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const wp = P.gf >= 0 ? B.FLAP[P.gf] : P.wing;
    B.wing(E, rig.wing.x + 1.5, rig.wing.y - 0.5, wp, o.wing, o.m, 1);                       // 远翼：普通绒毛小翅
    if (P.legs) F.legs(E, rig, P, o);                                                         // 受击 / 死亡时伸出的细腿（在身体后）
    F.body(E, rig, P, o); fuzz(); stitches(); string();
    if (!P.legs) feet();
    coin();
    boneWing(rig.wing.x - 1, rig.wing.y + 1.5, wp, BONE_W, m.bone, m.limb);                 // 近翼：秃骨翅
    head();
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效：自己的小物件池（抛物线弹道、会弹跳的金币、蛋壳、魂火） ─────
  const K_RICE = 1, K_EGG = 2, K_COIN = 3, K_SHELL = 4, K_BIG = 5, K_FLAME = 6, NO = 48;
  const OB = Array.from({ length: NO }, () => ({ k: 0, x: 0, y: 0, vx: 0, vy: 0, g: 0, age: 0, life: 0, bn: 0, rest: 0, tx: 0, ty: 0, fl: 0, s: 0 }));
  function obj(k, x, y, vx, vy, g, life) { for (const b of OB) if (!b.k) { b.k = k; b.x = x; b.y = y; b.vx = vx; b.vy = vy; b.g = g; b.age = 0; b.life = life; b.bn = 0; b.rest = 0; b.fl = 0; b.s = Math.random(); return b; } return null; }
  function aim(b, tx, ty, T) { b.tx = tx; b.ty = ty; b.fl = T; b.age = 0; b.vx = (tx - b.x) / T; b.vy = (ty - b.y - 0.5 * b.g * T * T) / T; }
  let egg = null, chargeAcc = 0, soulAcc = 0, lastF = -1, lastPeck = -1, crackT = 9, crackX = 0, crackY = 0;
  const T_CRACK = 0.2, EGG_G = 520;
  function coins(x, y, n, vmin, vmax, spread) { for (let i = 0; i < n; i++) { const b = obj(K_COIN, x + (Math.random() - 0.5) * 2, y, (Math.random() - 0.5) * spread, -(vmin + Math.random() * (vmax - vmin)), 380, 0.55 + Math.random() * 0.25); if (!b) break; } }
  function fluff(x, y, n, sp_) { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 6, (Math.random() - 0.5) * sp_, -10 - Math.random() * sp_ * 0.6, 0.9 + Math.random() * 0.7, R_FLUFF, { g: 22, dragX: 0.25, dragY: 0.4, floor: HY }); }
  function crack(x, y) {                                                                    // 金蛋在假人头顶「啵」地裂成两半，喷出金币
    crackT = 0; crackX = x; crackY = y;
    ring(x, y, 0, R_EL); fx.cross(x, y, 5, R_EL, 0.25, 2); burst(x, y, 10, 30, 80, 0.2, 0.45, R_EL, 12);
    obj(K_SHELL, x - 1, y, -34, -70, 420, 1.2); const sh = obj(K_SHELL, x + 1, y, 30, -64, 420, 1.2); if (sh) sh.s = 1.5;
    coins(x, y, 20, 60, 125, 110);
    hitDummy(0, 1); shake(0.12, 1); sfx('impact', { pal: 'coin', w: 0.5 });
  }
  function onEnter(s) {
    if (s === CAST) {                                                                       // 身体一弹：屁股下蹦出金蛋，飞到喙前
      poseAt(CAST, T_FLICK, E.simT); const bk = beakAt(), fx0 = scrX(bk[0] + P.bx + 2), fy0 = HY + bk[1] + 3;   // 挑蛋那一帧喙的位置
      poseAt(CHARGE, DUR[CHARGE] - 1 / 12, E.simT); const n = nestAt(), x = scrX(n[0] + P.bx), y = HY + n[1];   // 蓄力时蛋成形的位置
      poseAt(CAST, 0, E.simT);
      clearOrbit(); egg = obj(K_EGG, x, y, 0, 0, EGG_G, 3); if (egg) aim(egg, fx0, fy0, T_FLICK);
      burst(x, y, 16, 40, 100, 0.25, 0.55, R_EL, 14); ring(x, y - 1, 0, R_EL); shake(0.28, 2); flash(0.05); fluff(scrX(rig.C.x), HY + rig.C.y, 5, 30);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                      // 吐骨米：轻抛物线
      const [bx, by] = beakAt(), x = scrX(bx + P.bx), y = HY + by, b = obj(K_RICE, x + 1, y, 0, 0, 180, 2);
      if (b) aim(b, DUMMY_X - 3, HY - 13, 0.36);
      burst(x + 1, y, 5, 20, 50, 0.12, 0.25, R_EL, 0);
      sfx('swing', { kind: 'throw', w: 0.1 }); sfx('shoot', { proj: 'stone' });
    }
    if (s === CAST && t === T_FLICK && egg && egg.k === K_EGG) {                             // 喙一挑：金蛋沿抛物线飞向假人头顶
      egg.g = EGG_G; aim(egg, DUMMY_X, HY - 33, T_CRACK); egg.s = 2; burst(egg.x, egg.y, 6, 20, 60, 0.15, 0.3, R_EL, 6); sfx('shoot', { proj: 'coin' });
    }
    if (s === DEATH && t === T_BURST) {                                                     // 「噗」：炸成绒毛，铜钱和金币弹出（美味），魂火掉出来
      poseAt(DEATH, T_BURST - 1 / 12, T_BURST - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      const cx = scrX(rig.C.x + P.bx), cy = HY + rig.C.y, e = eyeAt(), cc = coinCenter();
      death.start('burst', { chunk: 3, power: 0.3, fromX: 0, fromY: R(rig.C.y), fadeAt: 0.8, fadeDur: 0.5, ramp: 'soul' });
      fluff(cx, cy, 18, 60); burst(cx, cy, 10, 30, 70, 0.2, 0.4, R_FLUFF, 6); ring(cx, cy, 0, R_EL); shake(0.15, 1);
      const big = obj(K_BIG, scrX(cc[0] + P.bx), HY + cc[1], -26, -90, 380, 1.6); if (big) big.life = 1.55;
      coins(cx, cy, 6, 70, 120, 90);
      obj(K_FLAME, scrX(e[0] + P.bx), HY + e[1], 6, -8, 70, 1.25);
    }
    if (s === DEATH && t === T_BURST + 0.45) sfx('fall', { w: 0.1 });                     // 绒毛和金币落定
  }
  const EVENTS = [[], [], [T_HIT], [], [T_FLICK], [], [], [T_BURST, T_BURST + 0.45], []];
  function hurtFx(s) {                                                                      // 受击：火花 + 掉绒毛
    const x = HX + HIT_POINT[0] - 1, y = HY + HIT_POINT[1];
    burst(x, y, s === DEATH ? 16 : 10, 40, 110, 0.2, 0.5, FXI.impact, 16); fluff(x, y, s === DEATH ? 8 : 5, 40);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepObj(dt) {
    for (const b of OB) {
      if (!b.k) continue; b.age += dt;
      if (b.k === K_RICE || b.k === K_EGG) {
        b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.k === K_RICE) { if (((E.stepN) & 1) === 0) spawn(K_TRAIL, b.x - 1, b.y, -10, (Math.random() - 0.5) * 6, 0.18 + Math.random() * 0.1, R_EL); }
        else if ((E.stepN % 3) === 0) spawn(K_TRAIL, b.x - 2, b.y + (Math.random() - 0.5) * 3, -20, (Math.random() - 0.5) * 8, 0.25 + Math.random() * 0.15, R_EL);
        if (b.fl && b.age >= b.fl) {
          b.x = b.tx; b.y = b.ty;
          if (b.k === K_RICE) { b.k = 0; burst(b.x, b.y, 8, 40, 90, 0.15, 0.35, R_EL, 10); hitDummy(0, 1); sfx('hit', { mat: 'stone', w: 0.15 }); }
          else if (b.s === 2) { b.k = 0; egg = null; crack(b.x, b.y); }
          else { b.vx = 0; b.vy = 0; b.fl = 0; b.g = 0; }                                    // 飘在喙前等挑
        }
        continue;
      }
      if (b.k === K_FLAME) { b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.y > HY - 1) { b.y = HY - 1; b.vx = 0; b.vy = 0; } if (b.age >= b.life) { b.k = 0; for (let i = 0; i < 3; i++) spawn(K_DUST, b.x, b.y, (Math.random() - 0.5) * 10, -6 - Math.random() * 6, 0.35, FXI.dust); } continue; }
      if (!b.rest) {
        b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.y >= HY) { b.y = HY; if (b.bn < 2 && Math.abs(b.vy) > 25) { b.vy = -Math.abs(b.vy) * 0.45; b.vx *= 0.6; b.bn++; } else { b.rest = 1; b.vx = 0; b.vy = 0; b.age = 0; } }
      } else if (b.age >= b.life) b.k = 0;
    }
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                                                 // 身下金色光点定点汇聚成蛋形
      chargeAcc += dt * (16 + 26 * clamp01(stT / DUR[CHARGE]));
      const n = nestAt(), tx = scrX(n[0] + P.bx), ty = HY + n[1];
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.PI * (1.05 + Math.random() * 0.9), r = 9 + Math.random() * 8; spawnX(K_SPIRAL_PT, tx, ty, r / (0.3 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: (Math.random() - 0.5) * 4, tx, ty }); }
    }
    if (state === MOVE) { const f = gait(q12(stT)); if (f !== lastF) { if (f === 2) fluff(scrX(rig.C.x - 2), HY + rig.C.y + 3, 1, 12); lastF = f; } }   // 沉到最低点掉一片绒毛
    if (state === RECOVER && stT < 0.1) fluff(scrX(rig.C.x), HY + rig.C.y, 1, 20);
    if (state === IDLE || state === RECOVER) {                                              // 啄铜钱：叮一下
      const lp = state === IDLE ? q12(stT) % DUR[IDLE] - 1.6 : q12(stT) - 0.25, k = lp >= -1e-6 && lp < 0.5 ? f12of(lp) : -1;
      if (k !== lastPeck) { if (k === 1) { const c = coinCenter(); burst(scrX(c[0] + P.bx), HY + c[1] - 1, 3, 15, 30, 0.1, 0.2, R_EL, 6); } lastPeck = k; }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 20; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 8 + Math.random() * 16, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.7, FXI.soul); } }
    stepObj(dt); crackT += dt;
  }
  function fxReset() { for (const b of OB) b.k = 0; egg = null; chargeAcc = 0; soulAcc = 0; lastF = -1; lastPeck = -1; crackT = 9; }
  function fxBack(f12) {
    if (P.dq < 0.6) groundShadow(scrX(rig.C.x + P.bx), 5, -rig.C.y - rig.ry);
    floorGlow(scrX(P.gx), P.rim, EL, f12);
  }
  function drawEgg(x, y, f12, lit) {                                                        // 金蛋 4×5：暗边、金身、白芯
    x = R(x); y = R(y);
    const ROWS = [[0, 1], [-1, 2], [-1, 2], [-1, 2], [0, 1]];
    for (let j = 0; j < 5; j++) for (let i = ROWS[j][0]; i <= ROWS[j][1]; i++) { const edge = i === ROWS[j][0] || i === ROWS[j][1] || j === 0 || j === 4; put(x + i, y - 2 + j, edge ? (j < 2 && i <= 0 ? EL[1] : EL[3]) : EL[2]); }
    put(x, y - 1, lit ? EL[0] : EL[1]); put(x, y, EL[1]); if (lit && (f12 & 1)) put(x + 1, y - 1, EL[0]);
  }
  function fxMid(f12) {
    if (E.state === CHARGE) {                                                               // 蛋形光点逐点亮起（在身下，被身体挡住一半）
      const n = nestAt(), cx = scrX(n[0] + P.bx), cy = HY + n[1], q = clamp01(E.stT / 1.1), N = 14;
      for (let k = 0; k < N; k++) { if (k / N > q) break; const a = k / N * 6.2832 - 1.57, x = R(cx + Math.cos(a) * 2.2 + 0.5), y = R(cy + Math.sin(a) * 2.8 - 0.3 * Math.sin(a)); put(x, y, (k + f12) % 5 === 0 ? EL[0] : EL[2]); }
      if (E.stT > 1.1) drawEgg(cx, cy, f12, 1);
    }
  }
  function fxFront(f12) {
    for (const b of OB) {
      if (!b.k) continue; const x = R(b.x), y = R(b.y);
      if (b.k === K_RICE) { put(x, y, 21); put(x - 1, y, 17); }
      else if (b.k === K_EGG) drawEgg(x, y, f12, 1);
      else if (b.k === K_COIN || b.k === K_BIG) {
        const q = b.rest ? b.age / b.life : 0, c = b.rest ? EL[q < 0.4 ? 2 : q < 0.75 ? 3 : 4] : ((f12 + R(b.s * 4)) & 2 ? EL[1] : EL[2]);
        if (b.k === K_BIG) { if (b.rest && q > 0.75 && (f12 & 1)) continue; put(x, y, 20); put(x - 1, y, c); put(x + 1, y, c); put(x, y - 1, c); put(x, y + 1 > HY ? y : y + 1, c); put(x - 1, y - 1, EL[1]); continue; }
        put(x, y, c); if (!b.rest && ((f12 + R(b.s * 4)) & 1)) put(x + 1, y, EL[1]);         // 空中翻面：宽 2 格 / 1 格交替
      } else if (b.k === K_SHELL) {
        if (!b.rest || b.age < b.life * 0.8 || (f12 & 1)) { const d = b.s > 1 ? 1 : -1; put(x, y, EL[1]); put(x + d, y, EL[2]); put(x, y - 1, EL[2]); put(x + d, y + 1 > HY ? y : y + 1, EL[3]); }
      } else if (b.k === K_FLAME) {                                                         // 魂火眼：掉到地上，闪几下熄灭
        const q = b.age / b.life; if (q > 0.55 && ((f12 & 1) || q > 0.85)) { put(x, y, 20); continue; }
        put(x, y, q < 0.3 ? 21 : 51); put(x, y - 1, 14); if (q < 0.4 && (f12 & 1)) put(x, y - 2, 51);
      }
    }
    if (E.state === CAST && E.stT < 0.1 && P.dq < 1) { const x = scrX(P.gx), y = HY + P.gy, L = 4; for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : EL[1]; put(x + r, y, c); put(x - r, y, c); put(x, y + r > HY ? HY : y + r, c); put(x, y - r, c); } }
    if (crackT < 2 / 12) { const c = crackT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(crackX - r, crackY - r, c); put(crackX + r, crackY - r, c); put(crackX - r - 1, crackY + 1, EL[2]); put(crackX + r + 1, crackY + 1, EL[2]); } }
  }

  return {
    name: '雏鸡', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.eye], HIT_POINT, EVENTS,
    deathKit: { mode: 'burst', at: T_BURST },
    SFX: { body: 'beast', how: 'explode', pal: 'coin', style: 'coin', w: 0.15, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, hurtFx, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
