// 宝石蜥蜴（部队 · 僵尸 · 射手 · 优质）：蜥蜴升级。同一只弗兰肯斯坦蜥蜴被电力充满、长出晶体：腿更长的高姿巨蜥，冷钢蓝灰鳞；
// 背上 4 簇锯齿宝石晶体（从尾到头逐个变高），铜避雷杆的钩子变成水晶托爪、托着一根竖立的酸绿水晶棱柱；颈后 4 片铜板褶伞（攻击 / 技能时张开），
// 颈电极螺栓变成铜箍 + 宝石，尾插头的两根插脚之间嵌一颗小宝石，身侧缝合线上嵌着晶粒，额心一颗小宝石。
// 攻击：后腿蹬地、前身微抬、颈褶张开，背上水晶棱柱射出一道短锯齿电弧弹；技能「超级发电机 · 全面升级」：4 簇脊晶像电量格一样从尾到头依次点亮，
// 电弧一颗颗跳过去接通棱柱，全身晶体闪白爆发，棱柱朝假人连射 6 道锯齿电弧、越来越密，假人被酸绿电弧缠住。死亡：脊晶一颗颗崩飞，身体碎成块。
// 身体用 parts-beast 的 quad（head lizard 放大、tail long）；脊晶、水晶避雷杆、颈褶、铜箍、尾插头、缝合线在本模块里自绘。
PCD.define('GemLizard', (E) => {
  const { Sprite, begin, part, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, death, sfx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, hash } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = fxRamp('corpseBolt', [21, 38, 50, 49, 48]), EL = FXR[R_EL];                 // 尸电（同蜥蜴）：白 → 淡黄绿 → 酸绿 → 橄榄 → 墨绿
  const m = B.mats(E, {
    main: [0, 28, 29, 30], belly: 'bone', claw: 'bone', copper: 'leather',                   // 冷钢蓝灰鳞（iron 提亮一级）、骨白腹线、铜件
    gem: [48, 49, 50, 38], gemLit: [48, 50, 38, 21], eye: [0, 0, 50, 50], glow: [38, 38, 38, 38],
  });
  const o = Q.shape({ len: 14, chest: 4.4, rump: 3.9, waist: 0.2, hump: 0, leg: 5, lw: 2, thigh: 2.4, farDx: -2, stride: 3, lift: 3, foot: 'claw',
    neck: 3.5, neckA: 0.35, neckW: 3, head: { type: 'lizard', w: 7, h: 5.5, snout: 4.5, snH: 3.5, tip: 0.8 }, headA: 0.1,
    tail: 'long', tailLen: 16, tailA: -0.06, tailW: 3.6, tailCurl: 0.04, mane: 'none', fur: 0, pattern: 'scales', lieLegs: 1, m });
  const XT = [[0, 3], [0.34, 4], [0.67, 5], [1, 6]];                                     // 4 簇脊晶：沿 臀心 → 杆底 的位置、高度（从尾到头逐个变高）
  const ROD_DX = -4, POLE = 4;                                                                // 水晶避雷杆：肩后 4 格，铜杆 4 格 + 托爪 + 棱柱 6 格
  const HX = 34, DUR = DEFAULT_DUR.slice(), hero = new Sprite(104, 52, 58, 46);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 15, 21], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'glow', 'ink', 'spec', 'gem', 'gemLit']) RIM.skip[m[k]] = 1;
  const XKEYS = [['frill', 0, 2], ['lit', 0, 5], ['blink', 0, 4], ['gone', 0, 4]];
  const SPEC = Q.KEYS.concat(B.COMMON, XKEYS);
  const P = {}; const reset = () => { Q.reset(P); P.frill = 0; P.lit = 0; P.blink = 0; P.gone = 0; }; reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'tail', 'reach', 'gem', 'frill'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, tail: 0, reach: 0, gem: 0, frill: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ bx: -2, crouch: 1, pitch: 1, head: -1, frill: 1, gem: 1 });           // 后腿蹬地、前身微抬、颈褶半开
  const A_HIT = pose({ bx: 1, pitch: 3, head: -1, jaw: 1, reach: 1, frill: 2, gem: 3, tail: 1 });   // 棱柱射出电弧
  const A_HOLD = pose({ bx: 0, pitch: 2, head: -1, reach: 1, frill: 2, gem: 2 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_HIT, 'snap'], [0.25, A_HIT, 'lin'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_POSE = pose({ pitch: 2, head: -1, crouch: 0, reach: 1, frill: 2, gem: 1 });         // 蓄力：颈褶完全张开、前身抬起
  const S_POSE = pose({ bx: -1, pitch: 3, head: -1, jaw: 2, reach: 2, frill: 2, gem: 3, tail: 1 });
  const S_RECOIL = pose({ bx: -2, pitch: 2, head: -1, jaw: 1, reach: 1, frill: 2, gem: 3, tail: 1 });
  const T_HIT = 2 / 12, T_LIT = [0.3, 0.6, 0.9, 1.2], T_LINK = 1.32, T_ARC = [0.05, 0.17, 0.27, 0.35, 0.41, 0.46];
  const T_POP = [0.06, 0.14, 0.22, 0.3], T_CRUMBLE = INCOMING + 0.42;

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    if (lp >= 1.6 - 1e-6 && lp < 2.0) {                                                        // 待机个性：俯卧撑示威（前腿撑起、点头两次，脊晶依次闪）
      const k = f12of(lp - 1.6); P.pitch = k === 0 || k === 2 ? 2 : 0; P.head = k === 1 || k === 3 ? 1 : -1; P.blink = k < 4 ? k + 1 : 0; P.tail = 0;
    }
  }
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  const tmp = {};
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                    // 高姿小跑：尾巴平直，宝石随步伐闪
      const f = Q.anim.walk(P, tq); P.tail = 0; P.head = f & 1 ? 0 : -1; P.blink = [1, 3, 2, 4][f];
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); P.rim = tq >= 0.12 && tq < 0.3 ? 2 : 0; }
    else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.5)); E.mix(tmp, REST, C_POSE, q, F_ALL); apply(tmp);
      P.lit = T_LIT.filter((x) => tq >= x - 1e-6).length;                                     // 电量格：每 0.3 s 点亮一簇
      P.gem = tq < T_LINK ? ((f12 & 1) && tq > 0.6 ? 2 : 1) : 2; P.rim = tq < T_LINK ? 2 : 3;
      if (tq > 1.1) P.jaw = (f12 & 1) ? 1 : 0;
    } else if (st === CAST) {
      const f = f12of(tq); apply(f === 0 ? S_POSE : (f & 1) ? S_RECOIL : S_POSE); P.lit = f === 0 ? 5 : 4; P.rim = 3;   // 第 0 帧：全身晶体闪白
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_RECOIL, REST, q, F_ALL); apply(tmp);
      P.frill = tq < 0.2 ? 2 : tq < 0.4 ? 1 : 0; P.lit = Math.max(0, 4 - Math.floor(tq / 0.1 + 1e-6)); P.gem = q < 0.3 ? 2 : q < 0.7 ? 1 : 0; P.rim = q < 0.5 ? 2 : q < 0.8 ? 1 : 0;
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); if (h < 0.2) P.frill = 1; } }
    else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (tq >= T_CRUMBLE) P.dq = 1;                                                     // 碎块交给死亡套件
      else { Q.anim.death(P, d, f12); P.gone = T_POP.filter((x) => d >= x - 1e-6).length; P.frill = 1; P.gem = (f12 & 1) ? 2 : 4; }   // 脊晶一颗颗崩飞
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.gem = tq > 0.85 ? 2 : 0; }
    rig = Q.rig(P, o);
    const g = prismTip(); P.gx = R(g[0]) + P.bx; P.gy = R(g[1]);
    B.key(P, SPEC);
  }

  // ───── 几何 ─────
  const spanTop = (x) => { const s = Q.span(rig, o, x); return s ? s[0] : R(rig.C1.y - rig.C1.r); };
  function rodBase() { const x = R(rig.C1.x + ROD_DX); return [x, spanTop(x)]; }
  function prismTip() { const [x, y] = rodBase(); return [x, y - POLE - 7]; }
  function crystalAt(i) { const x0 = rig.C2.x - 2.5, x = R(x0 + (rig.C1.x + ROD_DX - 2.5 - x0) * XT[i][0]); return [x, spanTop(x), XT[i][1]]; }   // [x, 背线 y, 高]
  function tailPts() {                                                                        // 和 quad.tail 同一套走向（纯几何）
    const pts = [], n = o.tailLen, sw = (P.tail | 0) * 0.2;
    let x = rig.tail.x, y = rig.tail.y, a = rig.lie === 2 ? -0.05 : o.tailA;
    for (let k = 0; k <= n; k++) { const q = k / n; pts.push([x, y]); a += o.tailCurl * q * 0.35 + sw * (0.25 + q) * 0.35; x -= Math.cos(a); y -= Math.sin(a); if (y > -0.5) { y = -0.5; a = 0; } }
    return pts;
  }

  // ───── 画 ─────
  // 候选部件：crystals（背脊晶簇：主晶 2 格宽带尖 + 后侧小晶；lit 1 = 充能发亮，flash 1 = 闪白）
  function drawCrystal(i, lit, fl) {
    part(); const [x, y, h] = crystalAt(i), mt = lit || fl ? m.gemLit : m.gem;
    for (let k = 0; k < h; k++) U.dot(E, x, y - k, mt, 4);                                                      // 主晶亮面（顶尖 1 格）
    for (let k = 0; k < h - 1; k++) U.dot(E, x + 1, y - k, mt, fl ? 4 : k === h - 2 ? 3 : 2);                    // 主晶暗面
    for (let k = 0; k < h - 2; k++) U.dot(E, x - 1, y - k, mt, fl ? 4 : k === h - 3 ? 4 : 3);                    // 后侧小晶
  }
  // 候选部件：crystalRod（水晶避雷杆：铜杆 + 铜线圈 + 两爪托着竖立棱柱；棱柱档位读 P.gem，0 暗 · 1 亮 · 2 很亮 · 3 爆闪 · 4 熄灭）
  function drawRod() {
    part(); const [x, y] = rodBase(), lv = P.gem;
    U.dot(E, x - 1, y, m.copper, 2); U.dot(E, x, y, m.copper, 3); U.dot(E, x + 1, y, m.copper, 2); U.dot(E, x - 1, y - 1, m.copper, 4); U.dot(E, x, y - 1, m.copper, 4); U.dot(E, x + 1, y - 1, m.copper, 3);   // 铜底座
    for (let k = 2; k <= POLE; k++) U.dot(E, x, y - k, m.copper, (k & 1) ? 3 : 4);
    U.dot(E, x - 1, y - 3, m.copper, 4); U.dot(E, x + 1, y - 3, m.copper, 2);                                                                // 线圈
    const yb = y - POLE - 1;                                                                                                                  // 托爪
    U.dot(E, x - 1, yb, m.copper, 4); U.dot(E, x, yb, m.copper, 3); U.dot(E, x + 1, yb, m.copper, 2); U.dot(E, x - 2, yb - 1, m.copper, 4); U.dot(E, x + 2, yb - 1, m.copper, 3); U.dot(E, x - 2, yb - 2, m.copper, 3); U.dot(E, x + 2, yb - 2, m.copper, 2);
    const hot = lv >= 1 && lv <= 3, mt = hot ? m.gemLit : m.gem;                                                                              // 棱柱（同一个部件：爪抓着它）
    for (let k = 1; k <= 5; k++) { const top = k === 5; U.dot(E, x - 1, yb - k, mt, lv === 3 ? 4 : lv === 4 ? 2 : top ? 3 : 4); U.dot(E, x, yb - k, mt, lv === 4 ? 2 : lv >= 2 && lv <= 3 ? 4 : 3); U.dot(E, x + 1, yb - k, mt, lv === 4 ? 1 : lv === 3 ? 3 : 2); }
    U.dot(E, x, yb - 6, mt, lv === 4 ? 2 : 4);
  }
  // 候选部件：frill（颈后褶伞：几片铜板从颈顶扇开，肋骨亮、板面暗、边缘扇贝；open 0 收 · 1 半开 · 2 全开）
  function drawFrill(open) {
    part(); const F = Q.headFrame(rig, o), c = F.at(-F.W * 0.75, F.top(-F.W * 0.75) + 1.2), n = 4;
    const r = [2.5, 4, 5.5][open], a0 = [2.7, 1.9, 1.45][open], a1 = [3.3, 3.6, 3.95][open], tips = [];
    for (let k = 0; k < n; k++) { const a = a0 + (a1 - a0) * k / (n - 1); tips.push([c[0] + Math.cos(a) * r, c[1] - Math.sin(a) * r * 0.95]); }
    const poly = [c[0], c[1]];
    for (let k = 0; k < n; k++) { poly.push(tips[k][0], tips[k][1]); if (k < n - 1) { const a = a0 + (a1 - a0) * (k + 0.5) / (n - 1); poly.push(c[0] + Math.cos(a) * (r - 1.3), c[1] - Math.sin(a) * (r - 1.3) * 0.95); } }
    U.poly(E, poly, m.copper, 2);
    for (let k = 0; k < n; k++) U.seg(E, c[0], c[1], tips[k][0], tips[k][1], 1, m.copper, k === 0 ? 4 : 3);                                // 肋骨
    if (open === 2) for (let k = 0; k < n; k++) U.dot(E, tips[k][0], tips[k][1], m.copper, 4);
  }
  // 候选部件：collar（颈铜箍 + 宝石钉：电极螺栓的升级版）
  function drawCollar() {
    part(); const NB = rig.NB, NT = rig.NT, q = 0.35, cx = NB.x + (NT.x - NB.x) * q, cy = NB.y + (NT.y - NB.y) * q, w = o.neckW;
    for (let v = -w + 0.5; v <= w - 0.3; v += 1) { U.dot(E, cx - 0.5, cy + v, m.copper, v < -w + 1.5 ? 4 : 3); U.dot(E, cx + 0.5, cy + v, m.copper, 2); }
    U.dot(E, cx - 1, cy - w - 0.5, m.copper, 3); U.dot(E, cx - 1, cy - w - 1.5, m.gemLit, 3);                                              // 宝石钉伸出颈线
  }
  // 候选部件：plug（尾插头，这一级插脚之间嵌一颗小宝石）
  function drawPlug(pts) {
    part(); const n = pts.length - 1, T = pts[n], Pv = pts[n - 1];
    let dx = T[0] - Pv[0], dy = T[1] - Pv[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L; const nx = -dy, ny = dx;
    for (let k = 0; k <= 1; k++) for (const s of [-1, 0, 1]) U.dot(E, T[0] + dx * k + nx * s, T[1] + dy * k + ny * s, m.copper, k === 0 ? (s < 0 ? 4 : s > 0 ? 2 : 3) : (s < 0 ? 3 : 2));
    for (const s of [-1, 1]) for (let k = 2; k <= 3; k++) U.dot(E, T[0] + dx * k + nx * s, T[1] + dy * k + ny * s, m.copper, 4);
    U.dot(E, T[0] + dx * 2, T[1] + dy * 2, P.lit >= 1 || P.blink === 1 ? m.gemLit : m.gem, 4);                                             // 插脚间的小宝石
  }
  function bodyMarks() {                                                                      // 与躯干同一个部件：背上亮鳞点 + 身侧缝合线（墨线 + 十字针脚），线上嵌晶粒
    const x0 = R(rig.C2.x + 1), x1 = R(rig.C1.x - 1);
    for (let x = R(rig.C2.x - 2); x <= R(rig.C1.x + 1); x++) { const s = Q.span(rig, o, x); if (s && ((x + 40) % 3) === 0) U.dot(E, x, s[0] + 1 + ((x + 40) % 2), m.body, 4); }
    for (let x = x0; x <= x1; x++) {
      const s = Q.span(rig, o, x); if (!s || s[1] - s[0] < 4) continue;
      const y = R(s[0] + (s[1] - s[0]) * 0.5 + Math.sin((x - x0) * 0.5) * 0.4);
      if (((x - x0) % 4) === 2) { U.dot(E, x, y, P.lit >= 5 ? m.gemLit : m.gem, 4); continue; }                                               // 嵌在缝线上的晶粒
      U.dot(E, x, y, m.body, 1);
      if (((x - x0) % 4) === 0) { U.dot(E, x - 1, y - 1, m.body, 4); U.dot(E, x + 1, y + 1, m.body, 1); U.dot(E, x + 1, y - 1, m.body, 1); U.dot(E, x - 1, y + 1, m.body, 4); }
    }
  }
  function faceExtras() {                                                                     // 与头同一个部件：额心小宝石 + 远侧的眼（结成了晶粒）
    const F = Q.headFrame(rig, o), u = F.W * 0.35, p = F.at(u + 0.6, F.top(u + 0.6) - 0.4), g = F.at(F.W * 0.95, F.top(F.W * 0.95) + 0.9);
    if (!P.eyes) U.dot(E, p[0], p[1], m.gem, 3);
    U.dot(E, g[0], g[1], P.lit >= 1 ? m.gemLit : m.gem, 4);
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    Q.legs(E, rig, P, o, 1);
    Q.tail(E, rig, P, o); drawPlug(tailPts());
    Q.body(E, rig, P, o); bodyMarks();
    Q.legs(E, rig, P, o, 0);
    for (let i = 0; i < 4; i++) if (i >= P.gone) drawCrystal(i, P.lit > i || P.blink === i + 1, P.lit >= 5);
    drawRod(); drawCollar(); drawFrill(P.frill);
    Q.head(E, rig, P, o); faceExtras();
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, soulAcc = 0, emberAcc = 0, lastGf = -9, lastBlink = 0, mzT = 9, mzX = 0, mzY = 0, recT = 9, arcN = 0;
  const loc = (p) => [scrX(R(p[0]) + P.bx), HY + R(p[1])];
  const tipScr = () => [scrX(P.gx), HY + P.gy];
  const crystalTop = (i) => { const [x, y, h] = crystalAt(i); return loc([x, y - h]); };
  const TX = DUMMY_X - 3, TY = HY - 15;
  function zig(a, b, seed, c1, c2) {                                                         // 短锯齿电弧（3 段折线）
    let px = a[0], py = a[1];
    for (let k = 1; k <= 3; k++) { const t = k / 3, j = k === 3 ? 0 : (hash(seed, k) - 0.5) * 4, nx = a[0] + (b[0] - a[0]) * t + j * 0.5, ny = a[1] + (b[1] - a[1]) * t + j; const L = Math.max(1, Math.ceil(Math.max(Math.abs(nx - px), Math.abs(ny - py)))); for (let s = 0; s <= L; s++) put(R(px + (nx - px) * s / L), R(py + (ny - py) * s / L), (k & 1) ? c1 : c2); px = nx; py = ny; }
  }
  function along(p, q) { const n = p.length - 1, f = clamp01(q) * n, i = Math.min(n - 1, Math.floor(f)), r = f - i; return [p[i][0] + (p[i + 1][0] - p[i][0]) * r, p[i][1] + (p[i + 1][1] - p[i][1]) * r]; }
  function drainPath() {                                                                      // 收招：余电从棱柱沿背 → 尾巴流回地面
    const [rx, ry] = rodBase(), T = tailPts(), n = T.length - 1, p = [[rx, ry - POLE - 3], [rx, ry - 1], [rig.C2.x, rig.C2.y - rig.C2.r + 1]];
    for (let k = 0; k <= n; k += 2) p.push([T[k][0], T[k][1] - 1]);
    p.push([T[n][0] - 3, 0]); return p.map(loc);
  }
  function onEnter(s) {
    if (s === CHARGE) arcN = 0;
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [gx, gy] = tipScr();
      releaseOrbit(45, 100, 0.3, 0.65); burst(gx, gy, 30, 55, 130, 0.25, 0.6, R_EL, 8); ring(gx, gy, 1, R_EL); fx.cross(gx, gy, 7, R_EL, 0.3);
      for (let i = 0; i < 4; i++) { const [cx, cy] = crystalTop(i); burst(cx, cy, 4, 20, 50, 0.1, 0.3, R_EL, 6); }
      shake(0.28, 2); flash(0.05); arcN = 0;
    }
    if (s === RECOVER) recT = 0;
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      const [gx, gy] = tipScr(), v = 190, vy = (TY - gy) * v / Math.max(8, TX - gx);
      shoot(1, gx + 1, gy, v, TX, R_EL, vy, { trail: { every: 2, life: [0.06, 0.14], back: [8, 20], off: 4 } });
      mzT = 0; mzX = gx; mzY = gy; burst(gx, gy, 6, 30, 70, 0.1, 0.25, R_EL, 4);
      sfx('swing', { kind: 'staff', w: 0.4 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === CHARGE && T_LIT.includes(t)) {                                                  // 点亮一簇：电弧从前一颗（第一颗从尾插头）跳过来
      const i = T_LIT.indexOf(t), to = crystalTop(i), T = tailPts(), from = i === 0 ? loc(T[T.length - 1]) : crystalTop(i - 1);
      fx.bolt(from[0], from[1], to[0], to[1], R_EL, 0.2, 2, 5 + i); burst(to[0], to[1], 6, 20, 50, 0.1, 0.3, R_EL, 6); fx.cross(to[0], to[1] - 1, 3, R_EL, 0.2);
    }
    if (s === CHARGE && t === T_LINK) { const a = crystalTop(3), b = tipScr(); fx.bolt(a[0], a[1], b[0], b[1], R_EL, 0.25, 2, 13); burst(b[0], b[1], 8, 20, 60, 0.1, 0.3, R_EL, 6); }
    if (s === CAST && T_ARC.includes(t)) {                                                    // 6 道锯齿电弧从棱柱连射，越来越密；最后一道最重
      const i = T_ARC.indexOf(t), last = i === T_ARC.length - 1, [gx, gy] = tipScr(), hx = DUMMY_X - 2 + R((hash(i, 3) - 0.5) * 6), hy = HY - 12 - R(hash(i, 9) * 12);
      fx.bolt(gx + 1, gy, hx, hy, R_EL, last ? 0.16 : 0.1, 2, 20 + i); fx.cross(hx, hy, last ? 6 : 3, R_EL, last ? 0.3 : 0.16);
      burst(hx, hy, last ? 20 : 7, 30, last ? 120 : 80, 0.12, last ? 0.5 : 0.3, R_EL, 8); hitDummy(last ? 1 : 0, 1);
      if (i === 0) dummyFx({ dur: 1.5, outline: R_EL });
      if (last) { ring(hx, hy, 1, R_EL); shake(0.12, 1); }
      sfx('impact', { pal: 'bolt', w: last ? 0.6 : 0.2 + i * 0.04 });
    }
    if (s === DEATH && T_POP.map((x) => INCOMING + x).some((x) => Math.abs(x - t) < 1e-9)) {  // 脊晶崩飞（从尾到头）
      const i = T_POP.findIndex((x) => Math.abs(INCOMING + x - t) < 1e-9), [x, y] = crystalTop(i);
      for (let k = 0; k < 5; k++) spawnX(K_PHYS, x, y + 2, (Math.random() - 0.7) * 60, -40 - Math.random() * 40, 0.7 + Math.random() * 0.3, R_EL, { g: 260, floor: HY, sz: k === 0 ? 2 : 1 });
      burst(x, y + 2, 5, 20, 50, 0.1, 0.25, R_EL, 6); sfx('hit', { mat: 'stone', w: 0.15 + i * 0.05 });
    }
    if (s === DEATH && t === T_CRUMBLE) {                                                     // 身体碎成块（死亡套件 chunks：炸开、落地弹跳成堆，再消散）
      poseAt(DEATH, T_CRUMBLE - 1 / 12, T_CRUMBLE - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('chunks', { chunk: 4, power: 0.7, fromX: 2, fromY: -10, push: -14, fadeAt: 1.05, fadeDur: 0.5, ramp: R_EL });
      burst(HX + 2, HY - 10, 18, 40, 110, 0.2, 0.5, R_EL, 10); shake(0.16, 1); poseAt(DEATH, t, t);
    }
    if (s === DEATH && t === T_CRUMBLE + 0.33) sfx('fall', { w: 0.3 });
  }
  const EVENTS = [[], [], [T_HIT], T_LIT.concat([T_LINK]), T_ARC, [], [], T_POP.map((x) => INCOMING + x).concat([T_CRUMBLE, T_CRUMBLE + 0.33]), []];
  function impactOn(k, x, y) {
    burst(x, y, 8, 30, 80, 0.12, 0.3, R_EL, 8); fx.cross(x, y, 4, R_EL, 0.18); fx.bolt(x - 5, y - 6, x + 4, y + 5, R_EL, 0.1, 2, 31);
    hitDummy(0, 1); sfx('hit', { mat: 'magic', w: 0.35 });
  }
  function hurtFx(s) {                                                                        // 火花里夹着晶屑和骨灰
    const hx = HX + HIT_POINT[0], hy = HY + HIT_POINT[1];
    burst(hx, hy, s === DEATH ? 16 : 10, 50, 120, 0.2, 0.5, FXI.impact, 18); burst(hx, hy - 3, s === DEATH ? 10 : 6, 30, 90, 0.2, 0.45, R_EL, 14); burst(hx, hy, 6, 20, 60, 0.35, 0.7, FXI.dust, 6);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    const [gx, gy] = tipScr();
    if (state === CHARGE && stT > 0.4) {                                                      // 棱柱汇聚
      chargeAcc += dt * (12 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 10 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) { spawn(K_DUST, scrX(P.gf === 0 ? 11 : -7) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 14, -3 - Math.random() * 5, 0.25 + Math.random() * 0.15, FXI.dust); sfx('step', { w: 0.3 }); }
      lastGf = P.gf;
    }
    if ((state === IDLE || state === MOVE) && P.blink && P.blink !== lastBlink) { const [cx, cy] = crystalTop(P.blink - 1); spawn(K_EMBER, cx, cy - 1, (Math.random() - 0.5) * 6, -6 - Math.random() * 6, 0.3 + Math.random() * 0.2, R_EL); }
    lastBlink = P.blink;
    if (state === RECOVER && stT < 0.5) { emberAcc += dt * 8; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx, gy - 1, Math.random() * 10 - 5, -8 - Math.random() * 8, 0.3 + Math.random() * 0.3, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.5 && stT < INCOMING + 2.3) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 20 + Math.random() * 34, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_EL); } }
    mzT += dt; recT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; emberAcc = 0; lastGf = -9; lastBlink = 0; mzT = 9; recT = 9; arcN = 0; }
  function fxBack(f12) {
    if (P.rim >= 2 && !rig.lie && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12);
    if (E.state === RECOVER && recT > 0.3 && recT < 0.65) { const p = drainPath(), e = p[p.length - 1]; for (let d = -4; d <= 4; d++) if (Math.abs(d) < 2 || ((d + f12) & 1) === 0) put(e[0] + d, FLOOR, Math.abs(d) < 2 ? EL[1] : EL[3]); }
    shotFloorGlow(f12);
  }
  function fxFront(f12) {
    const st = E.state, [gx, gy] = tipScr();
    if (P.gem >= 2 && P.gem <= 3 && !rig.lie && P.dq < 1) {                                  // 棱柱十字星芒
      const L = P.gem === 3 ? 6 : 3 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = P.gem === 3 ? (r <= 2 ? EL[0] : r <= 4 ? EL[1] : EL[2]) : (r <= 2 ? EL[1] : EL[2]); put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); }
      if (P.gem === 3) for (const [i, j] of [[2, 2], [-2, -2], [2, -2], [-2, 2]]) put(gx + i, gy + j, EL[1]);
    }
    if (st === CHARGE && P.dq < 1) for (let i = 0; i < P.lit; i++) { const [cx, cy] = crystalTop(i); if (((f12 + i) & 3) === 0) { put(cx, cy - 2, EL[0]); put(cx - 1, cy - 1, EL[1]); put(cx + 1, cy - 1, EL[1]); } }   // 已亮的晶尖冒电火花
    if (st === RECOVER && recT < 0.55 && P.dq < 1) { const p = drainPath(), q = clamp01(recT / 0.5), c = along(p, q), b = along(p, Math.max(0, q - 0.16)); zig(b, c, f12 * 5 + 2, EL[1], EL[2]); put(R(c[0]), R(c[1]), EL[0]); }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
  }
  function drawShot(k, x, y, d, f12, Rr) {                                                    // 短锯齿电弧弹：白色弹头 + 9 格折线身，折线逐帧翻转
    put(x, y, Rr[0]); put(x + d, y, Rr[0]); put(x, y - 1, Rr[1]); put(x, y + 1, Rr[1]);
    const ph = f12 & 1; let py = y;
    for (let i = 1; i <= 9; i++) { const zy = [0, -1, -2, -1, 0, 1, 2, 1, 0][(i + ph * 2) % 9]; put(x - d * i, y + zy, i < 3 ? Rr[0] : i < 6 ? Rr[1] : Rr[2]); if (i === 4 || i === 8) put(x - d * i, y + zy + (zy > 0 ? 1 : -1), Rr[2]); py = zy; }
    put(x + d * 2, y - 1 + ph * 2, Rr[1]);
    return true;
  }

  return {
    name: '宝石蜥蜴', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.eye, m.glow, m.gem, m.gemLit], HIT_POINT, EVENTS,
    deathKit: { mode: 'chunks', at: T_CRUMBLE },
    SFX: { body: 'beast', how: 'shatter', pal: 'bolt', style: 'spiral', w: 0.45 },
    REVIVE: { dy: -10, ramp: R_EL, big: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, hurtFx, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
